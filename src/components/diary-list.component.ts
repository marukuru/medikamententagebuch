import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Manufacturer, ActiveIngredient } from '../models';
import { DiaryEntryFormComponent } from './diary-entry-form.component';
import { TranslationService } from '../services/translation.service';
import { UiService } from '../services/ui.service';

/**
 * DiaryListComponent zeigt die Liste aller Tagebucheinträge an.
 * Bietet Funktionen zum Hinzufügen, Bearbeiten, Anzeigen und Löschen von Einträgen,
 * sowie Such- und Filterfunktionen.
 */
@Component({
  selector: 'diary-list',
  standalone: true,
  imports: [CommonModule, DatePipe, DiaryEntryFormComponent],
  templateUrl: './diary-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryListComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  uiService = inject(UiService);
  t = this.translationService.translations;

  // --- UI-Zustandssignale ---
  showForm = signal(false); // Steuert die Sichtbarkeit des Formulars für neue/bearbeitete Einträge
  showDetail = signal<DiaryEntry | null>(null); // Hält den Eintrag, der in der Detailansicht gezeigt wird
  editingEntry = signal<DiaryEntry | null>(null); // Hält den Eintrag, der gerade bearbeitet wird
  entryToDeleteId = signal<string | null>(null); // Hält die ID des Eintrags, für den die Löschbestätigung angezeigt wird

  // --- Suche & Filter ---
  searchTerm = signal(''); // Der aktuelle Suchbegriff
  dateFilter = signal<'all' | '7d' | '30d'>('all'); // Der aktive Datumsfilter

  /**
   * Ein Computed Signal, das die Tagebucheinträge basierend auf dem aktuellen
   * Suchbegriff und Datumsfilter filtert.
   */
  filteredEntries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.dateFilter();
    const allEntries = this.dataService.sortedDiaryEntries();

    // 1. Datumsfilter anwenden
    const dateFiltered = allEntries.filter(entry => {
      if (filter === 'all') return true;
      const entryDate = new Date(entry.datetime);
      const now = new Date();
      const daysAgo = (now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      if (filter === '7d') return daysAgo <= 7;
      if (filter === '30d') return daysAgo <= 30;
      return true;
    });

    // 2. Suchbegriff-Filter anwenden
    if (!term) {
      return dateFiltered;
    }

    return dateFiltered.filter(entry => {
      const details = this.getPreparationDetails(entry.preparationId);
      // Erstellt einen durchsuchbaren Text aus allen relevanten Eintragsdaten
      const searchCorpus = [
        entry.note || '',
        entry.mood.description,
        ...entry.effects.map(e => e.description),
        details.prep?.name || '',
        details.man?.name || '',
      ].join(' ').toLowerCase();

      return searchCorpus.includes(term);
    });
  });


  // --- Paginierung ---
  private initialLoadCount = 50; // Anzahl der Einträge, die initial geladen werden
  private subsequentLoadCount = 10; // Anzahl der Einträge, die bei "Mehr laden" nachgeladen werden
  visibleCount = signal(this.initialLoadCount); // Die Anzahl der aktuell sichtbaren Einträge
  
  /**
   * Ein Computed Signal, das die paginierte Liste der Einträge zurückgibt.
   */
  paginatedEntries = computed(() => {
    return this.filteredEntries().slice(0, this.visibleCount());
  });
  
  /**
   * Ein Computed Signal, das anzeigt, ob es noch mehr Einträge zum Laden gibt.
   */
  hasMoreEntries = computed(() => {
    return this.visibleCount() < this.filteredEntries().length;
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

  // --- Aktionsmethoden ---
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
    this.visibleCount.set(this.initialLoadCount); // Paginierung bei Filteränderung zurücksetzen
  }
}