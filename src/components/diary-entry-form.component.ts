import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { DiaryEntry } from '../models';

@Component({
  selector: 'diary-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diary-entry-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryEntryFormComponent {
  dataService = inject(DataService);
  entryToEdit = input<DiaryEntry | null>(null);
  close = output();

  isDirty = signal(false);
  showCancelConfirm = signal(false);

  // Form fields
  formMoodId = signal<string | undefined>(undefined);
  formEffectIds = signal<string[]>([]);
  formPreparationId = signal<string | undefined>(undefined);
  formDosageAmount = signal<number | null>(null);
  formDosageUnit = signal('');
  formNote = signal('');

  constructor() {
    effect(() => {
        const entry = this.entryToEdit();
        if (entry) {
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
      alert('Stimmung ist ein Pflichtfeld.');
      return;
    }

    const dosageAmount = this.formDosageAmount();
    const dosageUnit = this.formDosageUnit().trim();

    if ((dosageAmount !== null && !dosageUnit) || (dosageAmount === null && dosageUnit)) {
        alert('Für die Dosierung müssen Menge und Einheit angegeben werden, oder beide Felder leer sein.');
        return;
    }

    const effects = this.dataService.effects().filter(e => this.formEffectIds().includes(e.id));

    if (this.entryToEdit()) {
      const updatedEntry: DiaryEntry = {
        ...this.entryToEdit()!,
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
        datetime: new Date().toISOString(),
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

  confirmClose() {
    this.showCancelConfirm.set(false);
    this.close.emit();
  }

  abortClose() {
    this.showCancelConfirm.set(false);
  }

  formatPreparation(prep: any): string {
    const man = this.dataService.manufacturers().find((m: any) => m.id === prep.manufacturerId);
    const ai = this.dataService.activeIngredients().find((a: any) => a.id === prep.activeIngredientId);
    return `${man ? man.name + ' ' : ''}${prep.name}${ai ? ` (${ai.amount})` : ''}`;
  }
}