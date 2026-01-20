import { Injectable, signal, effect, computed } from '@angular/core';
import {
  Mood,
  Effect,
  Manufacturer,
  Dosage,
  ActiveIngredient,
  Preparation,
  DiaryEntry,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  theme = signal<'light' | 'dark'>('light');
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
      this.moods.set(parsedData.moods || this.getDefaultMoods());
      this.effects.set(parsedData.effects || this.getDefaultEffects());
      this.manufacturers.set(parsedData.manufacturers || []);
      this.dosages.set(parsedData.dosages || []);
      this.activeIngredients.set(parsedData.activeIngredients || []);
      this.preparations.set(parsedData.preparations || []);
      this.diaryEntries.set(parsedData.diaryEntries || []);
    } else {
      this.moods.set(this.getDefaultMoods());
      this.effects.set(this.getDefaultEffects());
    }
  }

  private saveToLocalStorage() {
    const data = {
      theme: this.theme(),
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

  deleteItem<T extends { id: string }>(stateSignal: ReturnType<typeof signal<T[]>>, id: string) {
    stateSignal.update(items => items.filter(i => i.id !== id));
     // Cascade delete logic
    // FIX: Cast stateSignal to `any` to bypass TypeScript's strict type checking.
    // This resolves the "no overlap" error by allowing the comparison between the
    // generic signal `WritableSignal<T[]>` and specific signal instances like
    // `this.manufacturers`, enabling the cascade delete logic.
    if (stateSignal as any === this.manufacturers) {
      this.preparations.update(p => p.map(prep => prep.manufacturerId === id ? { ...prep, manufacturerId: undefined } : prep));
    }
    if (stateSignal as any === this.activeIngredients) {
      this.preparations.update(p => p.map(prep => prep.activeIngredientId === id ? { ...prep, activeIngredientId: undefined } : prep));
    }
     if (stateSignal as any === this.dosages) {
      this.preparations.update(p => p.map(prep => prep.dosageId === id ? { ...prep, dosageId: undefined } : prep));
    }
     if (stateSignal as any === this.preparations) {
        this.diaryEntries.update(entries => entries.map(entry => entry.preparationId === id ? { ...entry, preparationId: undefined } : entry));
    }
  }

  toggleTheme() {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }
  
  // Data Export/Import
  exportData(): string {
    return JSON.stringify({
      theme: this.theme(),
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
    this.moods.set(this.getDefaultMoods());
    this.effects.set(this.getDefaultEffects());
    this.manufacturers.set([]);
    this.dosages.set([]);
    this.activeIngredients.set([]);
    this.preparations.set([]);
    this.diaryEntries.set([]);
  }

  // --- Default Data ---
  private getDefaultMoods(): Mood[] {
    return [
      { id: '1', emoji: '💩', description: 'Lausig' },
      { id: '2', emoji: '😥', description: 'Traurig' },
      { id: '3', emoji: '🥺', description: 'Schlecht' },
      { id: '4', emoji: '😐', description: 'Okay' },
      { id: '5', emoji: '🙂', description: 'Gut' },
      { id: '6', emoji: '☺️', description: 'Prima' },
    ];
  }

  private getDefaultEffects(): Effect[] {
    return [
      {
        id: '1', emoji: '😴', description: 'Schläfrig',
        perception: 'positive'
      },
      {
        id: '2', emoji: '😌', description: 'Schmerzlindernd',
        perception: 'positive'
      },
      {
        id: '3', emoji: '🤕', description: 'Schmerzverstärkend',
        perception: 'negative'
      },
      {
        id: '4', emoji: '😌', description: 'Körperlich entspannend',
        perception: 'positive'
      },
      {
        id: '5', emoji: '🧘', description: 'Geistig entspannt',
        perception: 'positive'
      },
      {
        id: '6', emoji: '🤸', description: 'Belebend',
        perception: 'positive'
      },
      {
        id: '7', emoji: '🙂‍↕️', description: 'Beruhigend',
        perception: 'positive'
      },
      {
        id: '8', emoji: '🫠', description: 'Verballert',
        perception: 'negative'
      },
      {
        id: '9', emoji: '👍', description: 'Motivierend',
        perception: 'positive'
      },
      {
        id: '10', emoji: '🤢', description: 'Unwohl',
        perception: 'negative'
      },
      {
        id: '11', emoji: '😨', description: 'Ängstlich',
        perception: 'negative'
      },
      {
        id: '12', emoji: '🤔', description: 'Fokussierend',
        perception: 'positive'
      },
      {
        id: '13', emoji: '🤓', description: 'Konzentriert',
        perception: 'positive'
      },
      {
        id: '14', emoji: '👥', description: 'Sozial',
        perception: 'neutral'
      },
    ];
  }
}