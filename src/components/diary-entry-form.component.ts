import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Mood, Symptom, Activity, Effect } from '../models';
import { UiService } from '../services/ui.service';
import { TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';

/**
 * DiaryEntryFormComponent ist ein modales Formular zum Erstellen und Bearbeiten
 * von Tagebucheinträgen.
 */
@Component({
  selector: 'diary-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diary-entry-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryEntryFormComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);
  t = this.translationService.translations;

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
  /**
   * Signal, das verfolgt, ob das Formular ungespeicherte Änderungen hat.
   */
  isDirty = signal(false);
  /**
   * Signal, das die Sichtbarkeit des "Änderungen verwerfen?"-Dialogs steuert.
   */
  showCancelConfirm = signal(false);

  // --- Formularfelder als Signale ---
  // Die Verwendung von Signalen für Formularfelder ermöglicht eine reaktive
  // und einfache Zustandsverwaltung innerhalb der Komponente.
  formDate = signal(''); // YYYY-MM-DD
  formTime = signal(''); // HH:mm
  formMoodId = signal<string | undefined>(undefined);
  formEffectIds = signal<string[]>([]);
  formSymptomIds = signal<string[]>([]);
  formActivityIds = signal<string[]>([]);
  formPreparationId = signal<string | undefined>(undefined);
  formDosageAmount = signal<number | null>(null);
  formDosageUnit = signal('');
  formNote = signal('');

  /**
   * Ein Computed Signal, das die Präparate für das Dropdown-Menü formatiert und sortiert.
   */
  preparationsForDropdown = computed(() => {
    return this.dataService.preparations()
        .map(prep => ({
            id: prep.id,
            formattedName: this.formatPreparation(prep)
        }))
        .sort((a, b) => a.formattedName.localeCompare(b.formattedName, 'de', { sensitivity: 'base' }));
  });

  constructor() {
    // Dieser `effect` wird ausgeführt, wenn sich `entryToEdit` ändert.
    // Er initialisiert das Formular entweder mit den Daten des Eintrags
    // oder setzt es auf die Standardwerte zurück.
    effect(() => {
        const entry = this.entryToEdit();
        if (entry) {
            // Bearbeitungsmodus: Formular mit Eintragsdaten füllen
            const entryDate = new Date(entry.datetime);
            this.formDate.set(this.formatDateForInput(entryDate));
            this.formTime.set(this.formatTimeForInput(entryDate));
            this.formMoodId.set(entry.mood.id);
            this.formEffectIds.set(entry.effects.map(e => e.id));
            this.formSymptomIds.set(entry.symptomIds || []);
            this.formActivityIds.set(entry.activityIds || []);
            this.formPreparationId.set(entry.preparationId);
            this.formDosageAmount.set(entry.dosage?.amount ?? null);
            this.formDosageUnit.set(entry.dosage?.unit ?? '');
            this.formNote.set(entry.note || '');
        } else {
            // Erstellungsmodus: Formular zurücksetzen
            this.resetForm();
        }
    }, { allowSignalWrites: true });

    // Dieser `effect` füllt automatisch die Dosierung aus, wenn ein Präparat
    // mit einer Standard-Dosierung ausgewählt wird.
    effect(() => {
      const prepId = this.formPreparationId();
      if (this.entryToEdit()) return; // Nicht überschreiben, wenn ein Eintrag bearbeitet wird

      const prep = this.dataService.preparations().find(p => p.id === prepId);
      if(prep && prep.dosageId) {
        const dosage = this.dataService.dosages().find(d => d.id === prep.dosageId);
        if(dosage) {
          this.formDosageAmount.set(dosage.amount);
          this.formDosageUnit.set(dosage.unit);
        }
      }
    }, { allowSignalWrites: true });
  }

  isEffectSelected(effectId: string): boolean {
    return this.formEffectIds().includes(effectId);
  }

  toggleEffect(effectId: string) {
    this.isDirty.set(true);
    const currentIds = this.formEffectIds();
    if (currentIds.includes(effectId)) {
      this.formEffectIds.set(currentIds.filter(id => id !== effectId));
    } else {
      this.formEffectIds.set([...currentIds, effectId]);
    }
  }

  isSymptomSelected(symptomId: string): boolean {
    return this.formSymptomIds().includes(symptomId);
  }

  toggleSymptom(symptomId: string) {
    this.isDirty.set(true);
    const currentIds = this.formSymptomIds();
    if (currentIds.includes(symptomId)) {
      this.formSymptomIds.set(currentIds.filter(id => id !== symptomId));
    } else {
      this.formSymptomIds.set([...currentIds, symptomId]);
    }
  }
  
  isActivitySelected(activityId: string): boolean {
    return this.formActivityIds().includes(activityId);
  }

  toggleActivity(activityId: string) {
    this.isDirty.set(true);
    const currentIds = this.formActivityIds();
    if (currentIds.includes(activityId)) {
      this.formActivityIds.set(currentIds.filter(id => id !== activityId));
    } else {
      this.formActivityIds.set([...currentIds, activityId]);
    }
  }
  
  /**
   * Markiert das Formular als "geändert", wenn ein Feld bearbeitet wird.
   */
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
    this.formDosageAmount.set(null);
    this.formDosageUnit.set('');
    this.formNote.set('');
    this.isDirty.set(false);
  }

  /**
   * Validiert die Formulardaten und speichert den Eintrag (entweder neu oder aktualisiert).
   */
  save() {
    // Validierung: Stimmung ist ein Pflichtfeld
    const moodId = this.formMoodId();
    const mood = this.dataService.moods().find(m => m.id === moodId);
    if (!mood) {
      this.toastService.showError(this.translationService.t('moodIsRequired'));
      return;
    }

    const dosageAmount = this.formDosageAmount();
    const dosageUnit = this.formDosageUnit().trim();
    // Validierung: Wenn eines der Dosierungsfelder ausgefüllt ist, muss das andere auch ausgefüllt sein
    if ((dosageAmount !== null && !dosageUnit) || (dosageAmount === null && dosageUnit)) {
        this.toastService.showError(this.translationService.t('dosageFieldsIncomplete'));
        return;
    }

    const effects = this.dataService.effects().filter(e => this.formEffectIds().includes(e.id));
    const newDatetime = new Date(`${this.formDate()}T${this.formTime()}`).toISOString();

    if (this.entryToEdit()) {
      // Bestehenden Eintrag aktualisieren
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

      if (dosageAmount !== null && dosageUnit) {
        updatedEntry.dosage = { id: '', amount: dosageAmount, unit: dosageUnit };
      } else {
        delete updatedEntry.dosage;
      }
      this.dataService.updateDiaryEntry(updatedEntry);
    } else {
      // Neuen Eintrag erstellen
      const newEntry: Omit<DiaryEntry, 'id'> = {
        datetime: newDatetime,
        mood: mood,
        preparationId: this.formPreparationId(),
        effects: effects,
        symptomIds: this.formSymptomIds().length > 0 ? this.formSymptomIds() : undefined,
        activityIds: this.formActivityIds().length > 0 ? this.formActivityIds() : undefined,
        note: this.formNote(),
      };

      if (dosageAmount !== null && dosageUnit) {
        (newEntry as DiaryEntry).dosage = { id: '', amount: dosageAmount, unit: dosageUnit };
      }
      this.dataService.addDiaryEntry(newEntry);
    }
    
    this.close.emit();
  }

  /**
   * Behandelt den Klick auf den "Abbrechen"-Button.
   * Zeigt bei ungespeicherten Änderungen eine Bestätigung an.
   */
  cancel() {
    if (this.isDirty()) {
      this.showCancelConfirm.set(true);
    } else {
      this.close.emit();
    }
  }

  openCreatePreparationForm() {
    this.uiService.openCreateForm('Preparation', (item: Preparation) => {
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

  /**
   * Bestätigt das Verwerfen von Änderungen und schließt das Formular.
   */
  confirmClose() {
    this.showCancelConfirm.set(false);
    this.close.emit();
  }

  /**
   * Bricht den Schließvorgang ab und kehrt zum Formular zurück.
   */
  abortClose() {
    this.showCancelConfirm.set(false);
  }

  /**
   * Formatiert den Namen eines Präparats für die Anzeige im Dropdown.
   * @param prep Das Präparat-Objekt.
   * @returns Ein formatierter String, z.B. "Hersteller - Name (Wirkstoff)".
   */
  formatPreparation(prep: Preparation): string {
    const man = this.dataService.manufacturers().find((m) => m.id === prep.manufacturerId);
    const ai = this.dataService.activeIngredients().find((a) => a.id === prep.activeIngredientId);
    return `${man ? man.name + ' - ' : ''}${prep.name}${ai ? ` (${ai.amount} ${ai.unit})` : ''}`;
  }

  // --- Private Hilfsmethoden ---
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}