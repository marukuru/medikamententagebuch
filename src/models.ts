export type EffectPerception = 'positive' | 'negative' | 'neutral';

export type CrudEntity = 'Mood' | 'Effect' | 'Manufacturer' | 'Dosage' | 'ActiveIngredient' | 'Preparation';

export interface Mood {
  id: string;
  description: string;
  emoji: string;
}

export interface Effect {
  id: string;
  description: string;
  emoji: string;
  perception: EffectPerception;
}

export interface Manufacturer {
  id: string;
  name: string;
}

export interface Dosage {
  id: string;
  amount: number;
  unit: string;
}

export interface ActiveIngredient {
  id: string;
  amount: string;
  unit: string;
}

export interface Preparation {
  id: string;
  name: string;
  manufacturerId?: string;
  activeIngredientId?: string;
  dosageId?: string;
}

export interface DiaryEntry {
  id: string;
  datetime: string; // ISO 8601 format
  mood: Mood; // Copied entity
  preparationId?: string;
  dosage?: Dosage; // Copied entity
  effects: Effect[]; // Copied entities
  note?: string;
}