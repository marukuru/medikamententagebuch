/**
 * Definiert die möglichen Wahrnehmungen für einen Effekt (positiv, negativ, neutral).
 */
export type EffectPerception = 'positive' | 'negative' | 'neutral';

/**
 * Definiert die Typen von Entitäten, die über die generischen CRUD-Formulare verwaltet werden können.
 */
export type CrudEntity = 'Mood' | 'Effect' | 'Manufacturer' | 'Dosage' | 'ActiveIngredient' | 'Preparation';

/**
 * Definiert die möglichen Seiten/Ansichten der Anwendung.
 */
export type Page = 'diary' | 'stats' | 'settings' | 'info';

/**
 * Repräsentiert eine Stimmung mit einer Beschreibung und einem zugehörigen Emoji.
 */
export interface Mood {
  id: string;
  description: string;
  emoji: string;
}

/**
 * Repräsentiert einen Effekt/eine Auswirkung mit Beschreibung, Emoji und einer Wahrnehmung.
 */
export interface Effect {
  id: string;
  description: string;
  emoji: string;
  perception: EffectPerception;
}

/**
 * Repräsentiert einen Hersteller eines Präparats.
 */
export interface Manufacturer {
  id: string;
  name: string;
}

/**
 * Repräsentiert eine spezifische Dosierung (Menge und Einheit).
 */
export interface Dosage {
  id: string;
  amount: number;
  unit: string;
}

/**
 * Repräsentiert den Wirkstoffgehalt (Menge und Einheit).
 * Die Menge ist ein String, um flexible Eingaben wie "10-20" zu ermöglichen.
 */
export interface ActiveIngredient {
  id: string;
  amount: string;
  unit: string;
}

/**
 * Repräsentiert ein medizinisches Präparat. Kann optional mit Hersteller, Wirkstoff und Standard-Dosierung verknüpft werden.
 */
export interface Preparation {
  id: string;
  name: string;
  manufacturerId?: string;
  activeIngredientId?: string;
  dosageId?: string;
}

/**
 * Repräsentiert einen einzelnen Tagebucheintrag.
 * Stimmung, Dosierung und Effekte werden als Kopien gespeichert, um historische Datenintegrität zu gewährleisten,
 * falls die ursprünglichen Entitäten in den Einstellungen geändert werden.
 */
export interface DiaryEntry {
  id: string;
  datetime: string; // ISO 8601 format
  mood: Mood; // Copied entity
  preparationId?: string;
  dosage?: Dosage; // Copied entity
  effects: Effect[]; // Copied entities
  note?: string;
}

/**
 * Repräsentiert eine geplante Erinnerungsbenachrichtigung.
 */
export interface Reminder {
  id: string;
  time: string; // "HH:mm" format
  days: number[]; // Wochentage, an denen wiederholt wird (1=So, 2=Mo, ..., 7=Sa)
}