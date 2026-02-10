import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Mood, Symptom, Activity, Effect } from '../models';
import { UiService } from '../services/ui.service';
import { TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

/**
 * DiaryEntryFormComponent ist ein modales Formular zum Erstellen und Bearbeiten
 * von Tagebucheinträgen.
 */
@Component({
  selector: 'diary-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './diary-entry-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryEntryFormComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);
  t = this.translationService.translations;

  // --- Icons ---
  faPlus = faPlus;

  // --- Inputs & Outputs ---
  /**
   * Nimmt einen optionalen Eintrag entgegen. Wenn dieser gesetzt ist,
   * befindet sich das Formular im Bearbeitungsmodus.
   */
  entryToEdit = input<DiaryEntry | null>(null);
  /**
   * Event, das ausgelöst wird, wenn das Formular geschlossen werden soll.
   */
  close = output();

  // --- UI-Zustand ---
  isDirty = signal(false);
  showCancelConfirm = signal(false);
  isPreparationDropdownOpen = signal(false);

  // --- Formularfelder als Signale ---
  formDate = signal(''); // YYYY-MM-DD
  formTime = signal(''); // HH:mm
  formMoodId = signal<string | undefined>(undefined);
  formEffectIds = signal<string[]>([]);
  formSymptomIds = signal<string[]>([]);
  formActivityIds = signal<string[]>([]);
  formPreparationId = signal<string | undefined>(undefined);
  preparationSearchText = signal(''); // Signal for the combobox text input
  formDosageAmount = signal<number | null>(null);
  formDosageUnit = signal('');
  formNote = signal('');

  /**
   * Sortiert die Präparate für das Dropdown.
   * Kriterien:
   * 1. Nach letztem Verwendungsdatum absteigend.
   * 2. Präparate ohne Verwendung am Ende, alphabetisch sortiert.
   */
  sortedPreparationsForDropdown = computed(() => {
    const lastUsedMap = new Map<string, string>();
    // `sortedDiaryEntries` ist bereits nach Datum absteigend sortiert.
    // Der erste Treffer für eine ID ist also die letzte Verwendung.
    for (const entry of this.dataService.sortedDiaryEntries()) {
        if (entry.preparationId && !lastUsedMap.has(entry.preparationId)) {
            lastUsedMap.set(entry.preparationId, entry.datetime);
        }
    }
    
    const allPreps = this.dataService.preparations().map(prep => ({
        id: prep.id,
        formattedName: this.formatPreparation(prep),
        lastUsed: lastUsedMap.get(prep.id)
    }));

    allPreps.sort((a, b) => {
        const lastUsedA = a.lastUsed;
        const lastUsedB = b.lastUsed;

        if (lastUsedA && lastUsedB) {
            // Beide wurden verwendet -> nach Datum absteigend sortieren
            // FIX: Explicitly cast Date objects to numbers for arithmetic operation to prevent type errors.
            return Number(new Date(lastUsedB)) - Number(new Date(lastUsedA));
        }
        if (lastUsedA) return -1; // Nur A wurde verwendet -> A kommt zuerst
        if (lastUsedB) return 1;  // Nur B wurde verwendet -> B kommt zuerst

        // Beide unbenutzt -> alphabetisch sortieren
        return a.formattedName.localeCompare(b.formattedName, this.translationService.language(), { sensitivity: 'base' });
    });
    
    return allPreps;
  });

  /**
   * Filtert die sortierte Präparate-Liste basierend auf der Texteingabe.
   */
  filteredPreparationsForDropdown = computed(() => {
      const searchText = this.preparationSearchText().toLowerCase();
      if (!searchText) {
          return this.sortedPreparationsForDropdown();
      }
      return this.sortedPreparationsForDropdown().filter(p => p.formattedName.toLowerCase().includes(searchText));
  });

  constructor() {
    effect(() => {
        const entry = this.entryToEdit();
        if (entry) {
            const entryDate = new Date(entry.datetime);
            this.formDate.set(this.formatDateForInput(entryDate));
            this.formTime.set(this.formatTimeForInput(entryDate));
            this.formMoodId.set(entry.mood?.id);
            this.formEffectIds.set(entry.effects.map(e => e.id));
            this.formSymptomIds.set(entry.symptomIds || []);
            this.formActivityIds.set(entry.activityIds || []);
            this.formPreparationId.set(entry.preparationId);

            if (entry.preparationId) {
                const prep = this.dataService.preparations().find(p => p.id === entry.preparationId);
                this.preparationSearchText.set(prep ? this.formatPreparation(prep) : '');
            } else {
                this.preparationSearchText.set('');
            }
            
            this.formDosageAmount.set(entry.dosage?.amount ?? null);
            this.formDosageUnit.set(entry.dosage?.unit ?? '');
            this.formNote.set(entry.note || '');
        } else {
            this.resetForm();
        }
    }, { allowSignalWrites: true });

    effect(() => {
      const prepId = this.formPreparationId();
      if (this.entryToEdit()) return; 

      const prep = this.dataService.preparations().find(p => p.id === prepId);
      if(prep && prep.dosageId) {
        const dosage = this.dataService.dosages().find(d => d.id === prep.dosageId);
        if(dosage) {
          this.formDosageAmount.set(dosage.amount);
          this.formDosageUnit.set(dosage.unit);
        }
      } else if (!prepId) {
          this.formDosageAmount.set(null);
          this.formDosageUnit.set('');
      }
    }, { allowSignalWrites: true });
  }

  isEffectSelected(effectId: string): boolean {
    return this.formEffectIds().includes(effectId);
  }

  toggleEffect(effectId: string) {
    this.isDirty.set(true);
    this.formEffectIds.update(ids => ids.includes(effectId) ? ids.filter(id => id !== effectId) : [...ids, effectId]);
  }

  isSymptomSelected(symptomId: string): boolean {
    return this.formSymptomIds().includes(symptomId);
  }

  toggleSymptom(symptomId: string) {
    this.isDirty.set(true);
    this.formSymptomIds.update(ids => ids.includes(symptomId) ? ids.filter(id => id !== symptomId) : [...ids, symptomId]);
  }
  
  isActivitySelected(activityId: string): boolean {
    return this.formActivityIds().includes(activityId);
  }

  toggleActivity(activityId: string) {
    this.isDirty.set(true);
    this.formActivityIds.update(ids => ids.includes(activityId) ? ids.filter(id => id !== activityId) : [...ids, activityId]);
  }
  
  fieldChanged() {
    this.isDirty.set(true);
  }

  resetForm() {
    const now = new Date();
    this.formDate.set(this.formatDateForInput(now));
    this.formTime.set(this.formatTimeForInput(now));
    this.formMoodId.set(undefined);
    this.formEffectIds.set([]);
    this.formSymptomIds.set([]);
    this.formActivityIds.set([]);
    this.formPreparationId.set(undefined);
    this.preparationSearchText.set('');
    this.formDosageAmount.set(null);
    this.formDosageUnit.set('');
    this.formNote.set('');
    this.isDirty.set(false);
  }

  // --- Präparat-Auswahl Logik ---
  onPreparationInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.preparationSearchText.set(value);
    this.fieldChanged();

    const matchedPrep = this.sortedPreparationsForDropdown().find(p => p.formattedName.toLowerCase() === value.toLowerCase());
    this.formPreparationId.set(matchedPrep ? matchedPrep.id : undefined);
    
    if (!this.isPreparationDropdownOpen()) {
        this.isPreparationDropdownOpen.set(true);
    }
  }

  onPreparationFocus() {
    this.isPreparationDropdownOpen.set(true);
  }

  onPreparationBlur() {
    // Kurze Verzögerung, damit ein Klick auf ein Dropdown-Item noch registriert werden kann
    setTimeout(() => {
        this.isPreparationDropdownOpen.set(false);
    }, 200);
  }

  selectPreparation(prep: {id: string, formattedName: string, lastUsed?: string}) {
    this.preparationSearchText.set(prep.formattedName);
    this.formPreparationId.set(prep.id);
    this.isPreparationDropdownOpen.set(false);
    this.fieldChanged();
  }

  save() {
    const moodId = this.formMoodId();
    const prepId = this.formPreparationId();

    if (!moodId && !prepId) {
      this.toastService.showError(this.translationService.t('moodOrPreparationRequired'));
      return;
    }
    
    const mood = moodId ? this.dataService.moods().find(m => m.id === moodId) : undefined;

    const dosageAmount = this.formDosageAmount();
    const dosageUnit = this.formDosageUnit().trim();
    if ((dosageAmount !== null && !dosageUnit) || (dosageAmount === null && dosageUnit)) {
        this.toastService.showError(this.translationService.t('dosageFieldsIncomplete'));
        return;
    }
    
    // Validierung: Wenn Text im Präparat-Feld steht, muss es einem gültigen Präparat entsprechen
    const prepSearchText = this.preparationSearchText().trim();
    if (prepSearchText && !this.formPreparationId()) {
        this.toastService.showError(this.translationService.t('invalidPreparationError'));
        return;
    }

    const effects = this.dataService.effects().filter(e => this.formEffectIds().includes(e.id));
    const newDatetime = new Date(`${this.formDate()}T${this.formTime()}`).toISOString();

    if (this.entryToEdit()) {
      const updatedEntry: DiaryEntry = {
        ...this.entryToEdit()!,
        datetime: newDatetime,
        mood: mood,
        preparationId: this.formPreparationId(),
        effects: effects,
        symptomIds: this.formSymptomIds().length > 0 ? this.formSymptomIds() : undefined,
        activityIds: this.formActivityIds().length > 0 ? this.formActivityIds() : undefined,
        note: this.formNote(),
      };
      updatedEntry.dosage = (dosageAmount !== null && dosageUnit) ? { id: '', amount: dosageAmount, unit: dosageUnit } : undefined;
      this.dataService.updateDiaryEntry(updatedEntry);
    } else {
      const newEntry: Omit<DiaryEntry, 'id'> = {
        datetime: newDatetime,
        mood: mood,
        preparationId: this.formPreparationId(),
        effects: effects,
        symptomIds: this.formSymptomIds().length > 0 ? this.formSymptomIds() : undefined,
        activityIds: this.formActivityIds().length > 0 ? this.formActivityIds() : undefined,
        note: this.formNote(),
        dosage: (dosageAmount !== null && dosageUnit) ? { id: '', amount: dosageAmount, unit: dosageUnit } : undefined,
      };
      this.dataService.addDiaryEntry(newEntry);
    }
    
    this.close.emit();
  }

  cancel() {
    if (this.isDirty()) {
      this.showCancelConfirm.set(true);
    } else {
      this.close.emit();
    }
  }

  openCreatePreparationForm() {
    this.isPreparationDropdownOpen.set(false);
    this.uiService.openCreateForm('Preparation', (item: Preparation) => {
        this.preparationSearchText.set(this.formatPreparation(item));
        this.formPreparationId.set(item.id);
        this.fieldChanged();
    });
  }
  
  openCreateSymptomForm() {
    this.uiService.openCreateForm('Symptom', (item: Symptom) => {
        this.formSymptomIds.update(ids => [...ids, item.id]);
        this.fieldChanged();
    });
  }

  openCreateActivityForm() {
    this.uiService.openCreateForm('Activity', (item: Activity) => {
        this.formActivityIds.update(ids => [...ids, item.id]);
        this.fieldChanged();
    });
  }

  openCreateEffectForm() {
    this.uiService.openCreateForm('Effect', (item: Effect) => {
        this.formEffectIds.update(ids => [...ids, item.id]);
        this.fieldChanged();
    });
  }

  openCreateMoodForm() {
    this.uiService.openCreateForm('Mood', (item: Mood) => {
        this.formMoodId.set(item.id);
        this.fieldChanged();
    });
  }

  confirmClose() {
    this.showCancelConfirm.set(false);
    this.close.emit();
  }

  abortClose() {
    this.showCancelConfirm.set(false);
  }

  formatPreparation(prep: Preparation): string {
    const man = this.dataService.manufacturers().find((m) => m.id === prep.manufacturerId);
    const ai = this.dataService.activeIngredients().find((a) => a.id === prep.activeIngredientId);
    return `${prep.name}${ai ? ` ${ai.amount} ${ai.unit}` : ''}${man ? ` (${man.name})` : ''}`;
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}