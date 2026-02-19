import { Injectable, signal, effect, computed } from '@angular/core';
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
  Symptom,
  Activity,
  Ingredient,
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
 * Definiert die Struktur für die Einstellungen der sichtbaren Module.
 */
export interface ModuleSettings {
  showMood: boolean;
  showDosage: boolean;
  showSymptoms: boolean;
  showActivities: boolean;
  showEffects: boolean;
  showNote: boolean;
  showDateGaps: boolean;
  showIngredients: boolean;
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
  // --- State Signals ---
  // Jeder Teil des Anwendungszustands wird in einem eigenen Signal gehalten.
  theme = signal<'light' | 'dark'>('light');
  lockSettings = signal<LockSettings>({ isEnabled: false, pin: null, timeout: 0 });
  moduleSettings = signal<ModuleSettings>({
    showMood: true,
    showDosage: true,
    showSymptoms: true,
    showActivities: true,
    showEffects: true,
    showNote: true,
    showDateGaps: true,
    showIngredients: true,
  });
  moods = signal<Mood[]>([]);
  effects = signal<Effect[]>([]);
  symptoms = signal<Symptom[]>([]);
  activities = signal<Activity[]>([]);
  manufacturers = signal<Manufacturer[]>([]);
  dosages = signal<Dosage[]>([]);
  activeIngredients = signal<ActiveIngredient[]>([]);
  preparations = signal<Preparation[]>([]);
  ingredients = signal<Ingredient[]>([]);
  diaryEntries = signal<DiaryEntry[]>([]);
  reminders = signal<Reminder[]>([]);
  customEmojis = signal<string[]>([]);

  // --- Computed Signals ---
  // Abgeleitete Daten, die sich automatisch aktualisieren, wenn die Quell-Signale sich ändern.

  /**
   * Gibt die Tagebucheinträge in absteigender chronologischer Reihenfolge zurück.
   */
  sortedDiaryEntries = computed(() =>
    // FIX: Explicitly cast Date objects to numbers for arithmetic operation to prevent type errors.
    this.diaryEntries().slice().sort((a, b) => Number(new Date(b.datetime)) - Number(new Date(a.datetime)))
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
  
  /**
   * Gibt die Inhaltsstoffe alphabetisch sortiert zurück.
   */
  sortedIngredients = computed(() =>
    this.ingredients().slice().sort((a, b) => a.name.localeCompare(b.name, this.translationService.language(), { sensitivity: 'base' }))
  );

  constructor(private translationService: TranslationService) {
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
      
      // Handle module settings with defaults for backward compatibility
      const defaultModuleSettings: ModuleSettings = {
        showMood: true,
        showDosage: true,
        showSymptoms: true,
        showActivities: true,
        showEffects: true,
        showNote: true,
        showDateGaps: true,
        showIngredients: true,
      };
      this.moduleSettings.set({ ...defaultModuleSettings, ...(parsedData.moduleSettings || {}) });

      this.moods.set(parsedData.moods || this.translationService.defaultMoods());
      this.effects.set(parsedData.effects || this.translationService.defaultEffects());
      this.symptoms.set(parsedData.symptoms || this.translationService.defaultSymptoms());
      this.activities.set(parsedData.activities || this.translationService.defaultActivities());
      this.manufacturers.set(parsedData.manufacturers || []);
      this.dosages.set(parsedData.dosages || []);
      this.activeIngredients.set(parsedData.activeIngredients || []);
      this.preparations.set(parsedData.preparations || []);
      this.ingredients.set(parsedData.ingredients || []);
      this.diaryEntries.set(parsedData.diaryEntries || []);
      this.reminders.set(parsedData.reminders || []);
      this.customEmojis.set(parsedData.customEmojis || []);
    } else {
      // Wenn keine Daten vorhanden sind, werden die Standard-Stimmungen und -Effekte geladen.
      this.moods.set(this.translationService.defaultMoods());
      this.effects.set(this.translationService.defaultEffects());
      this.symptoms.set(this.translationService.defaultSymptoms());
      this.activities.set(this.translationService.defaultActivities());
    }
  }

  /**
   * Speichert den gesamten Anwendungszustand im Local Storage.
   */
  private saveToLocalStorage() {
    const data = {
      theme: this.theme(),
      lockSettings: this.lockSettings(),
      moduleSettings: this.moduleSettings(),
      moods: this.moods(),
      effects: this.effects(),
      symptoms: this.symptoms(),
      activities: this.activities(),
      manufacturers: this.manufacturers(),
      dosages: this.dosages(),
      activeIngredients: this.activeIngredients(),
      preparations: this.preparations(),
      ingredients: this.ingredients(),
      diaryEntries: this.diaryEntries(),
      reminders: this.reminders(),
      customEmojis: this.customEmojis(),
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
  addItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, item: Omit<T, 'id'>): T {
    const newItem = { ...item, id: this.generateId() } as T;
    stateSignal.update(items => [...items, newItem]);
    return newItem;
  }

  updateItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, updatedItem: T) {
    stateSignal.update(items => items.map(i => i.id === updatedItem.id ? updatedItem : i));
  }

  updatePreparation(updatedPrep: Preparation) {
    // Zuerst das Präparat in der Hauptliste aktualisieren.
    this.preparations.update(items => items.map(p => p.id === updatedPrep.id ? updatedPrep : p));

    // Dann alle vorhandenen Tagebucheinträge, die dieses Präparat verwenden, rückwirkend aktualisieren.
    // Dies stellt sicher, dass Analysen konsistent sind und die neuesten bekannten Inhaltsstoffe widerspiegeln.
    this.diaryEntries.update(entries =>
      entries.map(entry => {
        if (entry.preparationId === updatedPrep.id) {
          // Ein neues Eintragsobjekt mit den aktualisierten Inhaltsstoff-IDs erstellen.
          return { ...entry, ingredientIds: updatedPrep.ingredientIds };
        }
        return entry;
      })
    );
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
      case 'Symptom':
        this.symptoms.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Tagebucheinträgen aufheben
         this.diaryEntries.update(entries => entries.map(entry => {
            if (entry.symptomIds?.includes(id)) {
              const newSymptomIds = entry.symptomIds.filter((sid: string) => sid !== id);
              // Wenn keine Symptome mehr übrig sind, das Array ganz entfernen
              return { ...entry, symptomIds: newSymptomIds.length > 0 ? newSymptomIds : undefined };
            }
            return entry;
          }));
        break;
       case 'Activity':
        this.activities.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Tagebucheinträgen aufheben
         this.diaryEntries.update(entries => entries.map(entry => {
            if (entry.activityIds?.includes(id)) {
              const newActivityIds = entry.activityIds.filter((aid: string) => aid !== id);
              return { ...entry, activityIds: newActivityIds.length > 0 ? newActivityIds : undefined };
            }
            return entry;
          }));
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
      case 'Ingredient':
        this.ingredients.update(items => items.filter(i => i.id !== id));
        // Verknüpfung in Präparaten aufheben
        this.preparations.update(preps => preps.map(prep => {
            if (prep.ingredientIds?.includes(id)) {
              const newIngredientIds = prep.ingredientIds.filter(ingId => ingId !== id);
              return { ...prep, ingredientIds: newIngredientIds.length > 0 ? newIngredientIds : undefined };
            }
            return prep;
          }));
        break;
      case 'CustomEmoji':
        this.customEmojis.update(items => items.filter(i => i !== id));
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
      moduleSettings: this.moduleSettings(),
      moods: this.moods(),
      effects: this.effects(),
      symptoms: this.symptoms(),
      activities: this.activities(),
      manufacturers: this.manufacturers(),
      dosages: this.dosages(),
      activeIngredients: this.activeIngredients(),
      preparations: this.preparations(),
      ingredients: this.ingredients(),
      diaryEntries: this.diaryEntries(),
      reminders: this.reminders(),
      customEmojis: this.customEmojis(),
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

      const defaultModuleSettings: ModuleSettings = {
        showMood: true,
        showDosage: true,
        showSymptoms: true,
        showActivities: true,
        showEffects: true,
        showNote: true,
        showDateGaps: true,
        showIngredients: true,
      };
      this.moduleSettings.set({ ...defaultModuleSettings, ...(data.moduleSettings || {}) });
      
      this.moods.set(data.moods || []);
      this.effects.set(data.effects || []);
      this.symptoms.set(data.symptoms || []);
      this.activities.set(data.activities || []);
      this.manufacturers.set(data.manufacturers || []);
      this.dosages.set(data.dosages || []);
      this.activeIngredients.set(data.activeIngredients || []);
      this.preparations.set(data.preparations || []);
      this.ingredients.set(data.ingredients || []);
      this.diaryEntries.set(data.diaryEntries || []);
      this.reminders.set(data.reminders || []);
      this.customEmojis.set(data.customEmojis || []);
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
    this.moduleSettings.set({ 
        showMood: true, 
        showDosage: true, 
        showSymptoms: true, 
        showActivities: true, 
        showEffects: true, 
        showNote: true, 
        showDateGaps: true,
        showIngredients: true,
    });
    this.moods.set(this.translationService.defaultMoods());
    this.effects.set(this.translationService.defaultEffects());
    this.symptoms.set(this.translationService.defaultSymptoms());
    this.activities.set(this.translationService.defaultActivities());
    this.manufacturers.set([]);
    this.dosages.set([]);
    this.activeIngredients.set([]);
    this.preparations.set([]);
    this.ingredients.set([]);
    this.diaryEntries.set([]);
    this.reminders.set([]);
    this.customEmojis.set([]);
  }
}