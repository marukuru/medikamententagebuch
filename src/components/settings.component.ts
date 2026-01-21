import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, EffectPerception } from '../models';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

type CrudEntity = 'Mood' | 'Effect' | 'Manufacturer' | 'Dosage' | 'ActiveIngredient' | 'Preparation';

@Component({
  selector: 'settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  dataService = inject(DataService);

  editingEntity = signal<{ type: CrudEntity, item: any } | null>(null);
  creatingEntity = signal<CrudEntity | null>(null);

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

  openCreateForm(type: CrudEntity) {
    this.resetForms();
    this.creatingEntity.set(type);
    this.editingEntity.set(null);
  }

  openEditForm(type: CrudEntity, item: any) {
    this.resetForms();
    this.creatingEntity.set(null);
    this.editingEntity.set({ type, item: { ...item } });

    switch (type) {
      case 'Mood': this.moodForm.set({ ...item }); break;
      case 'Effect': this.effectForm.set({ ...item }); break;
      case 'Manufacturer': this.manufacturerForm.set({ ...item }); break;
      case 'Dosage': this.dosageForm.set({ ...item }); break;
      case 'ActiveIngredient': this.activeIngredientForm.set({ ...item }); break;
      case 'Preparation': this.preparationForm.set({ ...item }); break;
    }
  }

  cancelForm() {
    this.editingEntity.set(null);
    this.creatingEntity.set(null);
    this.resetForms();
  }

  saveForm() {
    const creating = this.creatingEntity();
    const editing = this.editingEntity();

    if (creating) {
      this.handleCreate(creating);
    } else if (editing) {
      this.handleUpdate(editing.type, editing.item.id);
    }
    this.cancelForm();
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

    switch (item.type) {
      case 'Mood': this.dataService.deleteItem(this.dataService.moods, item.id); break;
      case 'Effect': this.dataService.deleteItem(this.dataService.effects, item.id); break;
      case 'Manufacturer': this.dataService.deleteItem(this.dataService.manufacturers, item.id); break;
      case 'Dosage': this.dataService.deleteItem(this.dataService.dosages, item.id); break;
      case 'ActiveIngredient': this.dataService.deleteItem(this.dataService.activeIngredients, item.id); break;
      case 'Preparation': this.dataService.deleteItem(this.dataService.preparations, item.id); break;
    }
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
      a.click();
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