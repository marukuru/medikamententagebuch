import { Injectable, signal, effect, computed, inject } from '@angular/core';
import {
  Mood,
  Effect,
  Manufacturer,
  Dosage,
  ActiveIngredient,
  Preparation,
  DiaryEntry,
  CrudEntity,
  Reminder,
} from '../models';
import { TranslationService } from './translation.service';

/**
 * Definiert die Struktur für die App-Sperreinstellungen.
 */
export interface LockSettings {
  isEnabled: boolean;
  pin: string | null;
  timeout: number; // in Millisekunden
}

/**
 * Der DataService ist der zentrale "Single Source of Truth" für alle Anwendungsdaten.
 * Er verwaltet den Zustand mithilfe von Angular Signals und kümmert sich um die
 * Persistenz der Daten im Local Storage.
 */
@Injectable({
  providedIn: 'root',
})
export class DataService {
  private translationService = inject(TranslationService);

  // --- State Signals ---
  // Jeder Teil des Anwendungszustands wird in einem eigenen Signal gehalten.
  theme = signal<'light' | 'dark'>('light');
  lockSettings = signal<LockSettings>({ isEnabled: false, pin: null, timeout: 0 });
  moods = signal<Mood[]>([]);
  effects = signal<Effect[]>([]);
  manufacturers = signal<Manufacturer[]>([]);
  dosages = signal<Dosage[]>([]);
  activeIngredients = signal<ActiveIngredient[]>([]);
  preparations = signal<Preparation[]>([]);
  diaryEntries = signal<DiaryEntry[]>([]);
  reminders = signal<Reminder[]>([]);

  // --- Computed Signals ---
  // Abgeleitete Daten, die sich automatisch aktualisieren, wenn die Quell-Signale sich ändern.

  /**
   * Gibt die Tagebucheinträge in absteigender chronologischer Reihenfolge zurück.
   */
  sortedDiaryEntries = computed(() => 
    this.diaryEntries().slice().sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
  );

  /**
   * Gibt die Hersteller alphabetisch sortiert zurück.
   */
  sortedManufacturers = computed(() =>
    this.manufacturers().slice().sort((a, b) => a.name.localeCompare(b.name, this.translationService.language(), { sensitivity: 'base' }))
  );

  /**
   * Gibt die Dosierungen sortiert nach Menge und dann nach Einheit zurück.
   */
  sortedDosages = computed(() =>
    this.dosages().slice().sort((a, b) => {
      if (a.amount !== b.amount) {
        return a.amount - b.amount;
      }
      return a.unit.localeCompare(b.unit, this.translationService.language(), { sensitivity: 'base' });
    })
  );

  /**
   * Gibt die Wirkstoffgehalte sortiert zurück. Versucht einen numerischen Vergleich,
   * fällt aber auf einen String-Vergleich zurück.
   */
  sortedActiveIngredients = computed(() =>
    this.activeIngredients().slice().sort((a, b) => {
      const amountA = parseFloat(a.amount.replace(',', '.'));
      const amountB = parseFloat(b.amount.replace(',', '.'));
      if (!isNaN(amountA) && !isNaN(amountB) && amountA !== amountB) {
        return amountA - amountB;
      }
      const amountCompare = a.amount.localeCompare(b.amount, this.translationService.language(), { sensitivity: 'base' });
      if (amountCompare !== 0) {
        return amountCompare;
      }
      return a.unit.localeCompare(b.unit, this.translationService.language(), { sensitivity: 'base' });
    })
  );

  /**
   * Gibt die Präparate alphabetisch sortiert zurück.
   */
  sortedPreparations = computed(() =>
    this.preparations().slice().sort((a, b) => a.name.localeCompare(b.name, this.translationService.language(), { sensitivity: 'base' }))
  );

  constructor() {
    this.loadFromLocalStorage();
    // effect() registriert eine Funktion, die immer dann ausgeführt wird,
    // wenn sich eines der darin gelesenen Signale ändert.
    // So wird der Zustand bei jeder Änderung automatisch gespeichert.
    effect(() => this.saveToLocalStorage());
  }

  /**
   * Erzeugt eine pseudo-eindeutige ID.
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Lädt den Anwendungszustand aus dem Local Storage beim Start.
   */
  private loadFromLocalStorage() {
    const data = localStorage.getItem('medikamententagebuch');
    if (data) {
      const parsedData = JSON.parse(data);
      this.theme.set(parsedData.theme || 'light');
      this.lockSettings.set(parsedData.lockSettings || { isEnabled: false, pin: null, timeout: 0 });
      this.moods.set(parsedData.moods || this.translationService.defaultMoods());
      this.effects.set(parsedData.effects || this.translationService.defaultEffects());
      this.manufacturers.set(parsedData.manufacturers || []);
      this.dosages.set(parsedData.dosages || []);
      this.activeIngredients.set(parsedData.activeIngredients || []);
      this.preparations.set(parsedData.preparations || []);
      this.diaryEntries.set(parsedData.diaryEntries || []);
      this.reminders.set(parsedData.reminders || []);
    } else {
      // Wenn keine Daten vorhanden sind, werden die Standard-Stimmungen und -Effekte geladen.
      this.moods.set(this.translationService.defaultMoods());
      this.effects.set(this.translationService.defaultEffects());
    }
  }

  /**
   * Speichert den gesamten Anwendungszustand im Local Storage.
   */
  private saveToLocalStorage() {
    const data = {
      theme: this.theme(),
      lockSettings: this.lockSettings(),
      moods: this.moods(),
      effects: this.effects(),
      manufacturers: this.manufacturers(),
      dosages: this.dosages(),
      activeIngredients: this.activeIngredients(),
      preparations: this.preparations(),
      diaryEntries: this.diaryEntries(),
      reminders: this.reminders(),
    };
    localStorage.setItem('medikamententagebuch', JSON.stringify(data));
  }

  // --- CRUD Methoden ---
  
  // Tagebucheintrag
  addDiaryEntry(entry: Omit<DiaryEntry, 'id'>) {
    this.diaryEntries.update(entries => [...entries, { ...entry, id: this.generateId() }]);
  }
  updateDiaryEntry(updatedEntry: DiaryEntry) {
    this.diaryEntries.update(entries => entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  }
  deleteDiaryEntry(id: string) {
    this.diaryEntries.update(entries => entries.filter(e => e.id !== id));
  }

  // Erinnerungen
  addReminder(reminder: Omit<Reminder, 'id'>) {
    this.reminders.update(reminders => [...reminders, { ...reminder, id: this.generateId() }]);
  }
  deleteReminder(id: string) {
    this.reminders.update(reminders => reminders.filter(r => r.id !== id));
  }

  // Generische CRUD Methoden für Einstellungs-Entitäten
  addItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, item: Omit<T, 'id'>) {
    stateSignal.update(items => [...items, { ...item, id: this.generateId() } as T]);
  }

  updateItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, updatedItem: T) {
    stateSignal.update(items => items.map(i => i.id === updatedItem.id ? updatedItem : i));
  }
  
  /**
   * Löscht eine Entität und kümmert sich um die Bereinigung von Verknüpfungen.
   * @param entityType Der Typ der zu löschenden Entität.
   * @param id Die ID der zu löschenden Entität.
   */
  deleteItem(entityType: CrudEntity, id: string) {
    switch (entityType) {
      case 'Mood':
        this.moods.update(items => items.filter(i => i.id !== id));
        break;
      case 'Effect':
        this.effects.update(items => items.filter(i => i.id !== id));
        break;
      case 'Manufacturer':
        this.manufacturers.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Präparaten aufheben
        this.preparations.update(p => p.map(prep => prep.manufacturerId === id ? { ...prep, manufacturerId: undefined } : prep));
        break;
      case 'Dosage':
        this.dosages.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Präparaten aufheben
        this.preparations.update(p => p.map(prep => prep.dosageId === id ? { ...prep, dosageId: undefined } : prep));
        break;
      case 'ActiveIngredient':
        this.activeIngredients.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Präparaten aufheben
        this.preparations.update(p => p.map(prep => prep.activeIngredientId === id ? { ...prep, activeIngredientId: undefined } : prep));
        break;
      case 'Preparation':
        this.preparations.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Tagebucheinträgen aufheben
        this.diaryEntries.update(entries => entries.map(entry => entry.preparationId === id ? { ...entry, preparationId: undefined } : entry));
        break;
    }
  }

  toggleTheme() {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }
  
  // --- Daten Export/Import ---

  /**
   * Erstellt einen JSON-String mit allen Anwendungsdaten für den Export.
   * Die PIN wird aus Sicherheitsgründen ausgeschlossen.
   */
  exportData(): string {
    const { pin, ...safeLockSettings } = this.lockSettings(); // PIN vom Export ausschließen
    return JSON.stringify({
      theme: this.theme(),
      language: this.translationService.language(),
      lockSettings: safeLockSettings,
      moods: this.moods(),
      effects: this.effects(),
      manufacturers: this.manufacturers(),
      dosages: this.dosages(),
      activeIngredients: this.activeIngredients(),
      preparations: this.preparations(),
      diaryEntries: this.diaryEntries(),
      reminders: this.reminders(),
    }, null, 2);
  }
  
  /**
   * Importiert Daten aus einem JSON-String und überschreibt den aktuellen Zustand.
   * Behandelt Sicherheitseinstellungen sorgfältig, um den Benutzer nicht auszusperren.
   * @param json Der JSON-String mit den zu importierenden Daten.
   * @returns `true` bei Erfolg, `false` bei einem Fehler.
   */
  importData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.theme.set(data.theme || 'light');
      if (data.language && (data.language === 'en' || data.language === 'de')) {
        this.translationService.setLanguage(data.language);
      }
      
      // Sicheres Importieren der Sperreinstellungen. Die Sperre wird nur aktiviert, wenn sie
      // im Backup aktiviert war UND bereits eine PIN auf dem aktuellen Gerät existiert.
      // Dies verhindert, dass Benutzer ausgesperrt werden.
      const importedSettings = data.lockSettings || {};
      const currentPin = this.lockSettings().pin;

      const shouldBeEnabled = importedSettings.isEnabled === true && !!currentPin;

      this.lockSettings.set({
        isEnabled: shouldBeEnabled,
        pin: shouldBeEnabled ? currentPin : null,
        timeout: importedSettings.timeout ?? 0,
      });

      this.moods.set(data.moods || []);
      this.effects.set(data.effects || []);
      this.manufacturers.set(data.manufacturers || []);
      this.dosages.set(data.dosages || []);
      this.activeIngredients.set(data.activeIngredients || []);
      this.preparations.set(data.preparations || []);
      this.diaryEntries.set(data.diaryEntries || []);
      this.reminders.set(data.reminders || []);
      return true;
    } catch (e) {
      console.error('Error importing data', e);
      return false;
    }
  }

  /**
   * Setzt alle Anwendungsdaten auf die Standardwerte zurück.
   */
  resetToDefaults() {
    this.theme.set('light');
    this.lockSettings.set({ isEnabled: false, pin: null, timeout: 0 });
    this.moods.set(this.translationService.defaultMoods());
    this.effects.set(this.translationService.defaultEffects());
    this.manufacturers.set([]);
    this.dosages.set([]);
    this.activeIngredients.set([]);
    this.preparations.set([]);
    this.diaryEntries.set([]);
    this.reminders.set([]);
  }
}