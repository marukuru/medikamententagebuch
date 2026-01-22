import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation } from '../models';
import { UiService } from '../services/ui.service';
import { TranslationService } from '../services/translation.service';

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
  t = this.translationService.translations;
  entryToEdit = input<DiaryEntry | null>(null);
  close = output();

  isDirty = signal(false);
  showCancelConfirm = signal(false);

  // Form fields
  formDate = signal(''); // YYYY-MM-DD
  formTime = signal(''); // HH:mm
  formMoodId = signal<string | undefined>(undefined);
  formEffectIds = signal<string[]>([]);
  formPreparationId = signal<string | undefined>(undefined);
  formDosageAmount = signal<number | null>(null);
  formDosageUnit = signal('');
  formNote = signal('');

  preparationsForDropdown = computed(() => {
    return this.dataService.preparations()
        .map(prep => ({
            id: prep.id,
            formattedName: this.formatPreparation(prep)
        }))
        .sort((a, b) => a.formattedName.localeCompare(b.formattedName, 'de', { sensitivity: 'base' }));
  });

  constructor() {
    effect(() => {
        const entry = this.entryToEdit();
        if (entry) {
            const entryDate = new Date(entry.datetime);
            this.formDate.set(this.formatDateForInput(entryDate));
            this.formTime.set(this.formatTimeForInput(entryDate));
            this.formMoodId.set(entry.mood.id);
            this.formEffectIds.set(entry.effects.map(e => e.id));
            this.formPreparationId.set(entry.preparationId);
            this.formDosageAmount.set(entry.dosage?.amount ?? null);
            this.formDosageUnit.set(entry.dosage?.unit ?? '');
            this.formNote.set(entry.note || '');
        } else {
            this.resetForm();
        }
    }, { allowSignalWrites: true });

    effect(() => {
      const prepId = this.formPreparationId();
      if (this.entryToEdit()) return; // Don't overwrite if editing

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
  
  fieldChanged() {
    this.isDirty.set(true);
  }

  resetForm() {
    const now = new Date();
    this.formDate.set(this.formatDateForInput(now));
    this.formTime.set(this.formatTimeForInput(now));
    this.formMoodId.set(undefined);
    this.formEffectIds.set([]);
    this.formPreparationId.set(undefined);
    this.formDosageAmount.set(null);
    this.formDosageUnit.set('');
    this.formNote.set('');
    this.isDirty.set(false);
  }

  save() {
    const moodId = this.formMoodId();
    const mood = this.dataService.moods().find(m => m.id === moodId);

    if (!mood) {
      alert(this.translationService.t('moodIsRequired'));
      return;
    }

    const dosageAmount = this.formDosageAmount();
    const dosageUnit = this.formDosageUnit().trim();

    if ((dosageAmount !== null && !dosageUnit) || (dosageAmount === null && dosageUnit)) {
        alert(this.translationService.t('dosageFieldsIncomplete'));
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
        note: this.formNote(),
      };

      if (dosageAmount !== null && dosageUnit) {
        updatedEntry.dosage = { id: '', amount: dosageAmount, unit: dosageUnit };
      } else {
        delete updatedEntry.dosage;
      }
      this.dataService.updateDiaryEntry(updatedEntry);
    } else {
      const newEntry: Omit<DiaryEntry, 'id'> = {
        datetime: newDatetime,
        mood: mood,
        preparationId: this.formPreparationId(),
        effects: effects,
        note: this.formNote(),
      };

      if (dosageAmount !== null && dosageUnit) {
        (newEntry as DiaryEntry).dosage = { id: '', amount: dosageAmount, unit: dosageUnit };
      }

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
    this.uiService.openCreateForm('Preparation');
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
    return `${man ? man.name + ' - ' : ''}${prep.name}${ai ? ` (${ai.amount} ${ai.unit})` : ''}`;
  }

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
