import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { CrudEntity, Reminder } from '../models';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { UiService } from '../services/ui.service';
import { Language, TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';
import { LockService } from '../services/lock.service';
import { NotificationService } from '../services/notification.service';

/**
 * SettingsComponent ist eine umfassende Seite zur Verwaltung aller App-Einstellungen.
 * Dies umfasst die Stammdaten (Stimmungen, Effekte etc.), Design, Sprache,
 * Sicherheit und Datenverwaltung (Import/Export/Reset).
 */
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
  lockService = inject(LockService);
  notificationService = inject(NotificationService);
  t = this.translationService.translations;

  // --- Zustandssignale für Bestätigungsdialoge ---
  itemToDelete = signal<{ type: CrudEntity, id: string, name: string } | null>(null);
  importFileContent = signal<string | null>(null);
  showResetConfirmStep1 = signal(false);
  showResetConfirmStep2 = signal(false);

  // --- Zustandssignale für das PIN-Modal ---
  showPinModal = signal(false);
  pinModalMode = signal<'create' | 'change'>('create');
  pinEntry = signal('');
  pinConfirm = signal('');
  pinError = signal<string | null>(null);

  // --- Zustandssignale für das Erinnerungs-Modal ---
  showReminderModal = signal(false);
  reminderTime = signal('08:00');
  reminderDays = signal(new Set<number>()); // Verwendet ein Set für einfaches Hinzufügen/Entfernen

  weekdays = computed(() => {
    const t = this.t();
    // Die Reihenfolge (Mo-So) ist für die UI. `value` entspricht den Capacitor-Wochentagen (1=So, 2=Mo...).
    return [
      { label: t.weekday_mo, value: 2 }, { label: t.weekday_tu, value: 3 }, { label: t.weekday_we, value: 4 },
      { label: t.weekday_th, value: 5 }, { label: t.weekday_fr, value: 6 }, { label: t.weekday_sa, value: 7 },
      { label: t.weekday_su, value: 1 }
    ];
  });
  
  isDaily = computed(() => this.reminderDays().size === 7);

  /**
   * Computed Signal für die Optionen des Auto-Lock-Timeouts.
   */
  timeoutOptions = computed(() => {
    const t = this.t();
    return [
      { value: 0, label: t.timeoutImmediately },
      { value: 60000, label: t.timeout1Minute },
      { value: 300000, label: t.timeout5Minutes },
      { value: 900000, label: t.timeout15Minutes },
    ];
  });

  /**
   * Computed Signal, das die Konfiguration für die CRUD-Abschnitte (Stimmungen, Effekte etc.)
   * generiert, um Duplikation im Template zu vermeiden.
   */
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
  
  // --- CRUD-Aktionen ---
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

  // --- Datenverwaltung ---
  async exportData() {
    const data = this.dataService.exportData();
    const fileName = `medikamententagebuch_backup_${new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-')}.json`;

    if (Capacitor.isNativePlatform()) {
      // Native (Android/iOS): Dateisystem-Plugin verwenden
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
      // Web-Fallback: Download über einen Blob-Link
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
    // Klickt programmatisch auf das versteckte file-Input-Element
    document.getElementById('import-file')?.click();
  }

  importData(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Zeigt das Bestätigungsmodal an, bevor der eigentliche Import stattfindet
        this.importFileContent.set(e.target?.result as string);
      };
      reader.readAsText(file);
      (event.target as HTMLInputElement).value = ''; // Input zurücksetzen, um selbe Datei erneut wählen zu können
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
    this.importFileContent.set(null); // Modal schließen
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

  // --- Sprach- und Designeinstellungen ---
  setLanguage(lang: Language) {
    this.translationService.setLanguage(lang);
  }

  // --- Sicherheitseinstellungen ---
  toggleLock(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled && !this.dataService.lockSettings().pin) {
      // Wenn Sperre aktiviert wird aber keine PIN existiert, öffne das PIN-Erstellungs-Modal
      this.openPinModal('create');
    } else {
      this.dataService.lockSettings.update(s => ({ ...s, isEnabled: enabled }));
    }
  }

  openPinModal(mode: 'create' | 'change') {
    this.pinModalMode.set(mode);
    this.pinEntry.set('');
    this.pinConfirm.set('');
    this.pinError.set(null);
    this.showPinModal.set(true);
  }

  closePinModal() {
    this.showPinModal.set(false);
    // Wichtig: Wenn der Benutzer das Erstellen einer neuen PIN abbricht,
    // muss der "Sperre aktivieren"-Schalter zurückgesetzt werden.
    if (this.pinModalMode() === 'create' && !this.dataService.lockSettings().pin) {
      this.dataService.lockSettings.update(s => ({ ...s, isEnabled: false }));
    }
  }

  savePin() {
    const pin = this.pinEntry();
    const confirm = this.pinConfirm();
    const t = this.t();

    if (pin.length !== 4) {
      this.pinError.set(t.pinErrorLength);
      return;
    }
    if (pin !== confirm) {
      this.pinError.set(t.pinErrorMismatch);
      return;
    }

    this.dataService.lockSettings.update(s => ({ ...s, pin: pin, isEnabled: true }));
    this.toastService.showSuccess(t.pinSetSuccess);
    this.closePinModal();
  }

  updateTimeout(event: Event) {
    const timeout = parseInt((event.target as HTMLSelectElement).value, 10);
    this.dataService.lockSettings.update(s => ({...s, timeout}));
  }
  
  // --- Erinnerungs-Einstellungen ---
  openReminderModal() {
    this.reminderTime.set('08:00');
    this.reminderDays.set(new Set());
    this.showReminderModal.set(true);
  }

  closeReminderModal() {
    this.showReminderModal.set(false);
  }

  toggleDay(dayValue: number) {
    this.reminderDays.update(days => {
      if (days.has(dayValue)) {
        days.delete(dayValue);
      } else {
        days.add(dayValue);
      }
      return new Set(days);
    });
  }

  toggleDaily() {
    this.reminderDays.update(days => {
      if (days.size === 7) {
        return new Set(); // Alle abwählen
      } else {
        return new Set([1, 2, 3, 4, 5, 6, 7]); // Alle anwählen
      }
    });
  }

  async saveReminder() {
    const days = Array.from(this.reminderDays());
    if (days.length === 0) {
        this.toastService.showError(this.t().reminderErrorNoDays);
        return;
    }
    
    // Berechtigungen anfordern, bevor die erste Erinnerung gespeichert wird
    const hasPermission = await this.notificationService.requestPermissions();
    if (!hasPermission) {
        return; // Der NotificationService zeigt bereits einen Toast an
    }

    const newReminder: Omit<Reminder, 'id'> = {
      time: this.reminderTime(),
      days: days,
    };
    this.dataService.addReminder(newReminder);
    this.closeReminderModal();
  }
  
  formatReminderDays(days: number[]): string {
    if (days.length === 7) return this.t().daily;
    if (days.length === 0) return '';
    
    const t = this.t();
    const dayMap: { [key: number]: string } = {
        2: t.weekday_mo, 3: t.weekday_tu, 4: t.weekday_we, 5: t.weekday_th,
        6: t.weekday_fr, 7: t.weekday_sa, 1: t.weekday_su
    };
    
    const displayOrder = [2, 3, 4, 5, 6, 7, 1];
    
    return days
      .slice()
      .sort((a, b) => displayOrder.indexOf(a) - displayOrder.indexOf(b))
      .map(d => dayMap[d])
      .join(', ');
  }
}