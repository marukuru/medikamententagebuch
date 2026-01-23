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
} from '../models';
import { TranslationService } from './translation.service';

export interface LockSettings {
  isEnabled: boolean;
  pin: string | null;
  timeout: number; // in milliseconds
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private translationService = inject(TranslationService);

  theme = signal<'light' | 'dark'>('light');
  lockSettings = signal<LockSettings>({ isEnabled: false, pin: null, timeout: 0 });
  moods = signal<Mood[]>([]);
  effects = signal<Effect[]>([]);
  manufacturers = signal<Manufacturer[]>([]);
  dosages = signal<Dosage[]>([]);
  activeIngredients = signal<ActiveIngredient[]>([]);
  preparations = signal<Preparation[]>([]);
  diaryEntries = signal<DiaryEntry[]>([]);

  sortedDiaryEntries = computed(() => 
    this.diaryEntries().slice().sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
  );

  // Computed signals for sorted data
  sortedManufacturers = computed(() =>
    this.manufacturers().slice().sort((a, b) => a.name.localeCompare(b.name, this.translationService.language(), { sensitivity: 'base' }))
  );

  sortedDosages = computed(() =>
    this.dosages().slice().sort((a, b) => {
      if (a.amount !== b.amount) {
        return a.amount - b.amount;
      }
      return a.unit.localeCompare(b.unit, this.translationService.language(), { sensitivity: 'base' });
    })
  );

  sortedActiveIngredients = computed(() =>
    this.activeIngredients().slice().sort((a, b) => {
      // Attempt to compare amounts as numbers if possible
      const amountA = parseFloat(a.amount.replace(',', '.'));
      const amountB = parseFloat(b.amount.replace(',', '.'));
      if (!isNaN(amountA) && !isNaN(amountB) && amountA !== amountB) {
        return amountA - amountB;
      }
      // Fallback to string comparison for amount
      const amountCompare = a.amount.localeCompare(b.amount, this.translationService.language(), { sensitivity: 'base' });
      if (amountCompare !== 0) {
        return amountCompare;
      }
      return a.unit.localeCompare(b.unit, this.translationService.language(), { sensitivity: 'base' });
    })
  );

  sortedPreparations = computed(() =>
    this.preparations().slice().sort((a, b) => a.name.localeCompare(b.name, this.translationService.language(), { sensitivity: 'base' }))
  );

  constructor() {
    this.loadFromLocalStorage();
    effect(() => this.saveToLocalStorage());
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

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
    } else {
      this.moods.set(this.translationService.defaultMoods());
      this.effects.set(this.translationService.defaultEffects());
    }
  }

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
    };
    localStorage.setItem('medikamententagebuch', JSON.stringify(data));
  }

  // --- CRUD Methods ---
  
  // DiaryEntry
  addDiaryEntry(entry: Omit<DiaryEntry, 'id'>) {
    this.diaryEntries.update(entries => [...entries, { ...entry, id: this.generateId() }]);
  }
  updateDiaryEntry(updatedEntry: DiaryEntry) {
    this.diaryEntries.update(entries => entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  }
  deleteDiaryEntry(id: string) {
    this.diaryEntries.update(entries => entries.filter(e => e.id !== id));
  }

  // Generic CRUD
  addItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, item: Omit<T, 'id'>) {
    stateSignal.update(items => [...items, { ...item, id: this.generateId() } as T]);
  }

  updateItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, updatedItem: T) {
    stateSignal.update(items => items.map(i => i.id === updatedItem.id ? updatedItem : i));
  }
  
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
        this.preparations.update(p => p.map(prep => prep.manufacturerId === id ? { ...prep, manufacturerId: undefined } : prep));
        break;
      case 'Dosage':
        this.dosages.update(items => items.filter(i => i.id !== id));
        this.preparations.update(p => p.map(prep => prep.dosageId === id ? { ...prep, dosageId: undefined } : prep));
        break;
      case 'ActiveIngredient':
        this.activeIngredients.update(items => items.filter(i => i.id !== id));
        this.preparations.update(p => p.map(prep => prep.activeIngredientId === id ? { ...prep, activeIngredientId: undefined } : prep));
        break;
      case 'Preparation':
        this.preparations.update(items => items.filter(i => i.id !== id));
        this.diaryEntries.update(entries => entries.map(entry => entry.preparationId === id ? { ...entry, preparationId: undefined } : entry));
        break;
    }
  }

  toggleTheme() {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }
  
  // Data Export/Import
  exportData(): string {
    const { pin, ...safeLockSettings } = this.lockSettings(); // Exclude PIN from export
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
    }, null, 2);
  }
  
  importData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.theme.set(data.theme || 'light');
      if (data.language && (data.language === 'en' || data.language === 'de')) {
        this.translationService.setLanguage(data.language);
      }
      
      // Safely import lock settings. The lock is only enabled if it was enabled in the backup
      // AND a PIN already exists on the current device. This prevents lockouts.
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
      return true;
    } catch (e) {
      console.error('Error importing data', e);
      return false;
    }
  }

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
  }
}