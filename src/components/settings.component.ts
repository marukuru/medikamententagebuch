import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, EffectPerception, CrudEntity } from '../models';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

interface FormState {
  type: CrudEntity;
  item?: any; // For editing
  formValues: Partial<any>; // The value of the corresponding form signal
}

@Component({
  selector: 'settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  dataService = inject(DataService);

  // Form Stack for managing nested forms
  formStack = signal<FormState[]>([]);
  // FIX: Replaced .at(-1) with array access to support older TypeScript targets.
  currentForm = computed(() => {
    const stack = this.formStack();
    return stack[stack.length - 1];
  });

  // Confirmation Modals State
  itemToDelete = signal<{ type: CrudEntity, id: string, name: string } | null>(null);
  importFileContent = signal<string | null>(null);
  showResetConfirmStep1 = signal(false);
  showResetConfirmStep2 = signal(false);

  // Form Models
  moodForm = signal<Partial<Mood>>({});
  effectForm = signal<Partial<Effect>>({});
  manufacturerForm = signal<Partial<Manufacturer>>({});
  dosageForm = signal<Partial<Dosage>>({});
  activeIngredientForm = signal<Partial<ActiveIngredient>>({});
  preparationForm = signal<Partial<Preparation>>({});

  perceptionOptions: { label: string; value: EffectPerception }[] = [
    { label: 'positiv', value: 'positive' },
    { label: 'negativ', value: 'negative' },
    { label: 'neutral', value: 'neutral' },
  ];

  entityConfigs = computed(() => [
    { type: 'Mood' as const, title: 'Stimmungen', emoji: '🙆', items: this.dataService.moods(), display: (i: any) => `${i.emoji} ${i.description}` },
    { type: 'Effect' as const, title: 'Effekte', emoji: '🧖', items: this.dataService.effects(), display: (i: any) => `${i.emoji} ${i.description}` },
    { type: 'Manufacturer' as const, title: 'Hersteller', emoji: '🏢', items: this.dataService.manufacturers(), display: (i: any) => i.name },
    { type: 'Preparation' as const, title: 'Präparate', emoji: '💊', items: this.dataService.preparations(), display: (i: any) => i.name },
    { type: 'Dosage' as const, title: 'Dosierungen', emoji: '💧', items: this.dataService.dosages(), display: (i: any) => `${i.amount} ${i.unit}` },
    { type: 'ActiveIngredient' as const, title: 'Wirkstoffgehalte', emoji: '🧪', items: this.dataService.activeIngredients(), display: (i: any) => `${i.amount} ${i.unit}` }
  ]);
  
  constructor() {
    effect(() => {
        const form = this.currentForm();
        this.resetForms(); // Clear all form signals first
        if(form) {
            // Populate with saved state from the stack
            switch(form.type) {
                case 'Mood': this.moodForm.set(form.formValues); break;
                case 'Effect': this.effectForm.set(form.formValues); break;
                case 'Manufacturer': this.manufacturerForm.set(form.formValues); break;
                case 'Dosage': this.dosageForm.set(form.formValues); break;
                case 'ActiveIngredient': this.activeIngredientForm.set(form.formValues); break;
                case 'Preparation': this.preparationForm.set(form.formValues); break;
            }
        }
    }, { allowSignalWrites: true });
  }

  openCreateForm(type: CrudEntity) {
    this.formStack.set([{ type, formValues: {} }]);
  }

  openEditForm(type: CrudEntity, item: any) {
    this.formStack.set([{ type, item: { ...item }, formValues: { ...item } }]);
  }
  
  openSubCreateForm(subFormType: CrudEntity) {
    this.formStack.update(stack => {
        // FIX: Replaced .at(-1) with array access to support older TypeScript targets.
        const currentFormState = stack[stack.length - 1]!;
        let currentFormValues;
        // Save the current values of the parent form before switching
        switch(currentFormState.type) {
            case 'Preparation': currentFormValues = this.preparationForm(); break;
            default: currentFormValues = {};
        }
        
        const newStack = stack.slice(0, -1); // Remove old state
        newStack.push({ ...currentFormState, formValues: currentFormValues }); // Add updated state
        newStack.push({ type: subFormType, formValues: {} }); // Add new sub-form state
        return newStack;
    });
  }


  cancelForm() {
    this.formStack.update(stack => stack.slice(0, -1));
  }

  saveForm() {
    const form = this.currentForm();
    if (!form) return;

    if (form.item) {
      this.handleUpdate(form.type, form.item.id);
    } else {
      this.handleCreate(form.type);
    }
    
    // Pop the form from the stack to go back or close
    this.formStack.update(stack => stack.slice(0, -1));
  }

  private handleCreate(type: CrudEntity) {
    switch (type) {
      case 'Mood': if (this.moodForm().description && this.moodForm().emoji) this.dataService.addItem(this.dataService.moods, this.moodForm() as Omit<Mood, 'id'>); break;
      case 'Effect': if (this.effectForm().description && this.effectForm().emoji) this.dataService.addItem(this.dataService.effects, this.effectForm() as Omit<Effect, 'id'>); break;
      case 'Manufacturer': if (this.manufacturerForm().name) this.dataService.addItem(this.dataService.manufacturers, this.manufacturerForm() as Omit<Manufacturer, 'id'>); break;
      case 'Dosage': if (this.dosageForm().amount && this.dosageForm().unit) this.dataService.addItem(this.dataService.dosages, this.dosageForm() as Omit<Dosage, 'id'>); break;
      case 'ActiveIngredient': if (this.activeIngredientForm().amount && this.activeIngredientForm().unit) this.dataService.addItem(this.dataService.activeIngredients, this.activeIngredientForm() as Omit<ActiveIngredient, 'id'>); break;
      case 'Preparation': if (this.preparationForm().name) this.dataService.addItem(this.dataService.preparations, this.preparationForm() as Omit<Preparation, 'id'>); break;
    }
  }

  private handleUpdate(type: CrudEntity, id: string) {
    switch (type) {
      case 'Mood': if (this.moodForm().description && this.moodForm().emoji) this.dataService.updateItem(this.dataService.moods, { ...this.moodForm(), id } as Mood); break;
      case 'Effect': if (this.effectForm().description && this.effectForm().emoji) this.dataService.updateItem(this.dataService.effects, { ...this.effectForm(), id } as Effect); break;
      case 'Manufacturer': if (this.manufacturerForm().name) this.dataService.updateItem(this.dataService.manufacturers, { ...this.manufacturerForm(), id } as Manufacturer); break;
      case 'Dosage': if (this.dosageForm().amount && this.dosageForm().unit) this.dataService.updateItem(this.dataService.dosages, { ...this.dosageForm(), id } as Dosage); break;
      case 'ActiveIngredient': if (this.activeIngredientForm().amount && this.activeIngredientForm().unit) this.dataService.updateItem(this.dataService.activeIngredients, { ...this.activeIngredientForm(), id } as ActiveIngredient); break;
      case 'Preparation': if (this.preparationForm().name) this.dataService.updateItem(this.dataService.preparations, { ...this.preparationForm(), id } as Preparation); break;
    }
  }

  requestDeleteItem(type: CrudEntity, id: string, name: string) {
    this.itemToDelete.set({ type, id, name });
  }

  confirmDeleteItem() {
    const item = this.itemToDelete();
    if (!item) return;

    this.dataService.deleteItem(item.type, item.id);
    this.itemToDelete.set(null);
  }

  cancelDeleteItem() {
    this.itemToDelete.set(null);
  }

  resetForms() {
    this.moodForm.set({});
    this.effectForm.set({});
    this.manufacturerForm.set({});
    this.dosageForm.set({});
    this.activeIngredientForm.set({});
    this.preparationForm.set({});
  }

  async exportData() {
    const data = this.dataService.exportData();
    const fileName = `medikamententagebuch_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        alert(`Backup wurde erfolgreich in Ihrem "Dokumente"-Ordner gespeichert als:\n${fileName}`);
      } catch (e) {
        console.error('Unable to write file', e);
        alert('Fehler beim Speichern des Backups.');
      }
    } else {
      // Web fallback
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  triggerImport() {
    document.getElementById('import-file')?.click();
  }

  importData(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.importFileContent.set(e.target?.result as string);
      };
      reader.readAsText(file);
      (event.target as HTMLInputElement).value = '';
    }
  }

  confirmImport() {
    const content = this.importFileContent();
    if (!content) return;
    const success = this.dataService.importData(content);
    if (!success) {
      alert('Import fehlgeschlagen. Die Datei ist möglicherweise beschädigt.');
    } else {
      alert('Import erfolgreich!');
    }
    this.importFileContent.set(null);
  }

  cancelImport() {
    this.importFileContent.set(null);
  }

  resetAllData() {
    this.showResetConfirmStep1.set(true);
  }

  proceedToResetStep2() {
    this.showResetConfirmStep1.set(false);
    this.showResetConfirmStep2.set(true);
  }

  confirmReset() {
    this.dataService.resetToDefaults();
    this.showResetConfirmStep2.set(false);
    alert('Die App wurde zurückgesetzt.');
  }

  cancelReset() {
    this.showResetConfirmStep1.set(false);
    this.showResetConfirmStep2.set(false);
  }
}
