import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Manufacturer, ActiveIngredient, Symptom, Activity } from '../models';
import { DiaryEntryFormComponent } from './diary-entry-form.component';
import { TranslationService } from '../services/translation.service';
import { UiService } from '../services/ui.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faChevronDown, faChevronUp, faSearch, faTimesCircle, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * DiaryListComponent zeigt die Liste aller Tagebucheinträge an.
 * Bietet Funktionen zum Hinzufügen, Bearbeiten, Anzeigen und Löschen von Einträgen,
 * sowie Such- und Filterfunktionen.
 */
@Component({
  selector: 'diary-list',
  standalone: true,
  imports: [CommonModule, DatePipe, DiaryEntryFormComponent, FontAwesomeModule],
  templateUrl: './diary-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryListComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  uiService = inject(UiService);
  t = this.translationService.translations;

  // --- Icons ---
  faFilter = faFilter;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faSearch = faSearch;
  faTimesCircle = faTimesCircle;
  faPlus = faPlus;
  faTimes = faTimes;

  // --- UI-Zustandssignale ---
  showForm = signal(false); // Steuert die Sichtbarkeit des Formulars für neue/bearbeitete Einträge
  showDetail = signal<DiaryEntry | null>(null); // Hält den Eintrag, der in der Detailansicht gezeigt wird
  editingEntry = signal<DiaryEntry | null>(null); // Hält den Eintrag, der gerade bearbeitet wird
  entryToDeleteId = signal<string | null>(null); // Hält die ID des Eintrags, für den die Löschbestätigung angezeigt wird
  showFilters = signal(false); // Steuert die Sichtbarkeit des Filter-Akkordeons

  // --- Suche & Filter ---
  searchTerm = signal(''); // Der aktuelle Suchbegriff
  dateFilter = signal<'all' | '7d' | '30d'>('all'); // Der aktive Datumsfilter
  yearFilter = signal<number | 'all'>('all'); // Der neue Jahresfilter

  /**
   * Ein Computed Signal, das alle eindeutigen Jahre aus den Tagebucheinträgen extrahiert.
   */
  availableYears = computed(() => {
    const years = this.dataService.diaryEntries()
      .map(entry => new Date(entry.datetime).getFullYear());
    // Eindeutige Jahre ermitteln und absteigend sortieren
    return [...new Set(years)].sort((a, b) => b - a);
  });

  /**
   * Ein Computed Signal, das die Tagebucheinträge basierend auf dem aktuellen
   * Suchbegriff und Datumsfilter filtert.
   */
  private filteredEntries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const dateF = this.dateFilter();
    const yearF = this.yearFilter();
    const allEntries = this.dataService.sortedDiaryEntries();

    let temporarilyFilteredEntries: DiaryEntry[];

    // 1. Priorität: Jahresfilter. Wenn aktiv, werden die anderen Datumsfilter ignoriert.
    if (yearF !== 'all') {
      temporarilyFilteredEntries = allEntries.filter(entry => new Date(entry.datetime).getFullYear() === yearF);
    } else {
      // Ansonsten, wende den relativen Datumsfilter an.
      temporarilyFilteredEntries = allEntries.filter(entry => {
        if (dateF === 'all') return true;
        const entryDate = new Date(entry.datetime);
        const now = new Date();
        // FIX: Cast Date objects to numbers to perform arithmetic subtraction.
        const daysAgo = (Number(now) - Number(entryDate)) / (1000 * 3600 * 24);
        if (dateF === '7d') return daysAgo <= 7;
        if (dateF === '30d') return daysAgo <= 30;
        return true;
      });
    }

    // 2. Suchbegriff-Filter auf die bereits gefilterte Liste anwenden
    if (!term) {
      return temporarilyFilteredEntries;
    }

    return temporarilyFilteredEntries.filter(entry => {
      const details = this.getPreparationDetails(entry.preparationId);
      const symptoms = this.getSymptoms(entry.symptomIds);
      const activities = this.getActivities(entry.activityIds);
      // Erstellt einen durchsuchbaren Text aus allen relevanten Eintragsdaten
      const searchCorpus = [
        entry.note || '',
        entry.mood?.description || '',
        ...entry.effects.map(e => e.description),
        ...symptoms.map(s => s.description),
        ...activities.map(a => a.description),
        details.prep?.name || '',
        details.man?.name || '',
      ].join(' ').toLowerCase();

      return searchCorpus.includes(term);
    });
  });

  /**
   * Ein Computed Signal, das die gefilterten Einträge um die Information
   * über die Datumslücke zum jeweils nächsten Eintrag erweitert.
   */
  private entriesWithGaps = computed(() => {
    const entries = this.filteredEntries();
    return entries.map((entry, index) => {
      let gap = 0;
      if (index < entries.length - 1) {
        const nextEntry = entries[index + 1];

        const currentDate = new Date(entry.datetime);
        const nextDate = new Date(nextEntry.datetime);

        // Zeit auf Mitternacht setzen, um nur das Datum zu vergleichen
        currentDate.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);

        // FIX: Cast Date objects to numbers to perform arithmetic subtraction.
        const diffTime = Number(currentDate) - Number(nextDate);
        // Math.round, um Probleme mit der Sommerzeit zu vermeiden
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Ein Tag Lücke bedeutet, die Differenz ist 2 Tage (z.B. 25. vs 23.)
        gap = diffDays > 1 ? diffDays - 1 : 0;
      }
      return { ...entry, gapAfter: gap };
    });
  });

  /**
   * Ein Computed Signal, das die Lücke zwischen heute und dem ersten
   * (neuesten) Eintrag in der gefilterten Liste berechnet.
   */
  gapBeforeFirstEntry = computed(() => {
    const entries = this.filteredEntries();
    if (entries.length === 0) {
      return 0;
    }

    const firstEntry = entries[0]; // Dies ist der neueste Eintrag in der gefilterten Liste
    const today = new Date();
    const firstEntryDate = new Date(firstEntry.datetime);

    // Zeit auf Mitternacht setzen, um nur das Datum zu vergleichen
    today.setHours(0, 0, 0, 0);
    firstEntryDate.setHours(0, 0, 0, 0);

    // Keine Lücke für zukünftige Einträge anzeigen
    if (firstEntryDate.getTime() > today.getTime()) {
      return 0;
    }

    // FIX: Cast Date objects to numbers to perform arithmetic subtraction.
    const diffTime = Number(today) - Number(firstEntryDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Eine Differenz von 1 Tag (heute vs. gestern) bedeutet 0 ausgelassene Tage.
    // Eine Differenz von 2 Tagen (heute vs. vorgestern) bedeutet 1 ausgelassener Tag.
    return diffDays > 1 ? diffDays - 1 : 0;
  });

  // --- Paginierung ---
  private initialLoadCount = 50; // Anzahl der Einträge, die initial geladen werden
  private subsequentLoadCount = 10; // Anzahl der Einträge, die bei "Mehr laden" nachgeladen werden
  visibleCount = signal(this.initialLoadCount); // Die Anzahl der aktuell sichtbaren Einträge
  
  /**
   * Ein Computed Signal, das die paginierte Liste der Einträge zurückgibt.
   */
  paginatedEntries = computed(() => {
    return this.entriesWithGaps().slice(0, this.visibleCount());
  });
  
  /**
   * Ein Computed Signal, das anzeigt, ob es noch mehr Einträge zum Laden gibt.
   */
  hasMoreEntries = computed(() => {
    return this.visibleCount() < this.entriesWithGaps().length;
  });

  constructor() {
    effect(() => {
      if (this.uiService.requestDiaryFormOpen()) {
        // Sicherstellen, dass das Formular nicht bereits angezeigt wird
        if (!this.showForm()) {
          this.addEntry();
        }
        // Den Auslöser immer zurücksetzen, damit er nicht erneut feuert
        this.uiService.requestDiaryFormOpen.set(false);
      }
    }, { allowSignalWrites: true });
  }

  /**
   * Hilfsmethode, um die vollständigen Details (Präparat, Hersteller, Wirkstoff)
   * zu einer Präparat-ID zu erhalten.
   * @param prepId Die ID des Präparats.
   * @returns Ein Objekt mit den zugehörigen Entitäten.
   */
  getPreparationDetails(prepId?: string): { prep: Preparation | undefined, man: Manufacturer | undefined, ai: ActiveIngredient | undefined } {
    if (!prepId) return { prep: undefined, man: undefined, ai: undefined };
    const prep = this.dataService.preparations().find(p => p.id === prepId);
    if (!prep) return { prep: undefined, man: undefined, ai: undefined };
    const man = this.dataService.manufacturers().find(m => m.id === prep.manufacturerId);
    const ai = this.dataService.activeIngredients().find(a => a.id === prep.activeIngredientId);
    return { prep, man, ai };
  }

  getSymptoms(symptomIds?: string[]): Symptom[] {
    if (!symptomIds || symptomIds.length === 0) return [];
    const allSymptoms = this.dataService.symptoms();
    return symptomIds.map(id => allSymptoms.find(s => s.id === id)).filter((s): s is Symptom => !!s);
  }

  getActivities(activityIds?: string[]): Activity[] {
    if (!activityIds || activityIds.length === 0) return [];
    const allActivities = this.dataService.activities();
    return activityIds.map(id => allActivities.find(a => a.id === id)).filter((a): a is Activity => !!a);
  }

  // --- Aktionsmethoden ---
  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  addEntry() {
    this.editingEntry.set(null);
    this.showForm.set(true);
  }

  editEntry(entry: DiaryEntry) {
    this.editingEntry.set(entry);
    this.showDetail.set(null); // Detailansicht schließen, falls offen
    this.showForm.set(true);
  }

  viewEntry(entry: DiaryEntry) {
    this.showDetail.set(entry);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingEntry.set(null);
  }
  
  // --- Löschvorgang ---
  requestDeleteConfirmation(id: string) {
    this.entryToDeleteId.set(id);
  }

  cancelDelete() {
    this.entryToDeleteId.set(null);
  }

  confirmDelete() {
    const id = this.entryToDeleteId();
    if (!id) return;

    this.dataService.deleteDiaryEntry(id);
    this.showDetail.set(null); // Detailansicht schließen, falls der gelöschte Eintrag angezeigt wurde
    this.entryToDeleteId.set(null);
  }

  loadMore() {
    this.visibleCount.update(count => count + this.subsequentLoadCount);
  }

  // --- Event Handler für Filter und Suche ---
  onSearchTermChange(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.visibleCount.set(this.initialLoadCount); // Paginierung bei neuer Suche zurücksetzen
  }

  clearSearchTerm() {
    this.searchTerm.set('');
    this.visibleCount.set(this.initialLoadCount); // Paginierung zurücksetzen
  }

  setDateFilter(filter: 'all' | '7d' | '30d') {
    this.dateFilter.set(filter);
    this.yearFilter.set('all'); // Jahresfilter zurücksetzen, wenn ein Datumsfilter gesetzt wird
    this.visibleCount.set(this.initialLoadCount); // Paginierung bei Filteränderung zurücksetzen
  }

  setYearFilter(year: number | 'all') {
    this.yearFilter.set(year);
    this.dateFilter.set('all'); // Datumsfilter zurücksetzen, wenn ein Jahresfilter gesetzt wird
    this.visibleCount.set(this.initialLoadCount);
  }

  onYearFilterChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    // Der Wert von <option> ist immer ein String.
    const year = selectedValue === 'all' ? 'all' : parseInt(selectedValue, 10);
    this.setYearFilter(year);
  }
}