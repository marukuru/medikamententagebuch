import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { CrudEntity } from '../models';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { UiService } from '../services/ui.service';
import { Language, TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);
  t = this.translationService.translations;

  // Confirmation Modals State
  itemToDelete = signal<{ type: CrudEntity, id: string, name: string } | null>(null);
  importFileContent = signal<string | null>(null);
  showResetConfirmStep1 = signal(false);
  showResetConfirmStep2 = signal(false);

  entityConfigs = computed(() => {
    const t = this.t();
    return [
      { type: 'Mood' as const, title: t.crudMoods, emoji: '🙆', items: this.dataService.moods(), display: (i: any) => `${i.emoji} ${i.description}` },
      { type: 'Effect' as const, title: t.crudEffects, emoji: '🧖', items: this.dataService.effects(), display: (i: any) => `${i.emoji} ${i.description}` },
      { type: 'Manufacturer' as const, title: t.crudManufacturers, emoji: '🏢', items: this.dataService.sortedManufacturers(), display: (i: any) => i.name },
      { type: 'Preparation' as const, title: t.crudPreparations, emoji: '💊', items: this.dataService.sortedPreparations(), display: (i: any) => i.name },
      { type: 'Dosage' as const, title: t.crudDosages, emoji: '💧', items: this.dataService.sortedDosages(), display: (i: any) => `${i.amount} ${i.unit}` },
      { type: 'ActiveIngredient' as const, title: t.crudActiveIngredients, emoji: '🧪', items: this.dataService.sortedActiveIngredients(), display: (i: any) => `${i.amount} ${i.unit}` }
    ];
  });
  
  openCreateForm(type: CrudEntity) {
    this.uiService.openCreateForm(type);
  }

  openEditForm(type: CrudEntity, item: any) {
    this.uiService.openEditForm(type, item);
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

  async exportData() {
    const data = this.dataService.exportData();
    const fileName = `medikamententagebuch_backup_${new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-')}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        this.toastService.showSuccess(this.translationService.t('backupSavedSuccess').replace('{{fileName}}', fileName), 10000);
      } catch (e) {
        console.error('Unable to write file', e);
        this.toastService.showError(this.translationService.t('backupSavedError'));
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
      this.toastService.showError(this.translationService.t('importFailed'));
    } else {
      this.toastService.showSuccess(this.translationService.t('importSuccess'));
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
    this.toastService.showSuccess(this.translationService.t('appResetSuccess'));
  }

  cancelReset() {
    this.showResetConfirmStep1.set(false);
    this.showResetConfirmStep2.set(false);
  }

  setLanguage(lang: Language) {
    this.translationService.setLanguage(lang);
  }
}