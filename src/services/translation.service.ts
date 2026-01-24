import { Injectable, signal, computed, effect } from '@angular/core';
import { LANG_DE } from '../i18n/de';
import { LANG_EN } from '../i18n/en';

// Bündelt alle Sprachpakete in einem Objekt für einfachen Zugriff.
const ALL_TRANSLATIONS = {
  de: LANG_DE,
  en: LANG_EN,
};

export type Language = keyof typeof ALL_TRANSLATIONS;
export type TranslationKey = keyof typeof LANG_DE.translations;

/**
 * TranslationService verwaltet die Internationalisierung (i18n) der Anwendung.
 * Er ermittelt die Benutzersprache, lädt die entsprechenden Übersetzungen
 * und stellt sie der gesamten Anwendung zur Verfügung.
 */
@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private storageKey = 'med-diary-lang';
  
  /**
   * Ein Signal, das die aktuell ausgewählte Sprache hält (z.B. 'de' oder 'en').
   */
  language = signal<Language>(this.getInitialLanguage());

  /**
   * Ein Computed Signal, das das Objekt mit den Übersetzungs-Strings für die
   * aktuell ausgewählte Sprache bereitstellt.
   */
  translations = computed(() => ALL_TRANSLATIONS[this.language()].translations);
  
  /**
   * Computed Signals, die die sprachspezifischen Standard-Stimmungen und -Effekte liefern.
   */
  defaultMoods = computed(() => ALL_TRANSLATIONS[this.language()].defaultMoods);
  defaultEffects = computed(() => ALL_TRANSLATIONS[this.language()].defaultEffects);
  defaultSymptoms = computed(() => ALL_TRANSLATIONS[this.language()].defaultSymptoms);

  constructor() {
    // Speichert die ausgewählte Sprache im Local Storage, wenn sie sich ändert.
    effect(() => {
      localStorage.setItem(this.storageKey, this.language());
    });
  }
  
  /**
   * Ermittelt die initiale Sprache basierend auf der folgenden Priorität:
   * 1. Gespeicherte Sprache im Local Storage.
   * 2. Browsersprache des Benutzers.
   * 3. Fallback auf Englisch ('en').
   * @returns Die ermittelte Sprache.
   */
  private getInitialLanguage(): Language {
    const storedLang = localStorage.getItem(this.storageKey);
    if (storedLang && this.isLanguage(storedLang)) {
      return storedLang;
    }

    const browserLang = navigator.language.split('-')[0];
    if (this.isLanguage(browserLang)) {
      return browserLang;
    }
    
    return 'en'; // Standard-Fallback
  }

  /**
   * Type Guard, um zu prüfen, ob ein String eine gültige, unterstützte Sprache ist.
   * @param lang Der zu prüfende Sprachcode.
   * @returns `true`, wenn die Sprache unterstützt wird.
   */
  private isLanguage(lang: string): lang is Language {
    return lang in ALL_TRANSLATIONS;
  }

  /**
   * Setzt die aktive Sprache der Anwendung.
   * @param lang Die neue Sprache.
   */
  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  /**
   * Gibt einen übersetzten String für einen gegebenen Schlüssel zurück.
   * Dies ist eine Kurzform für `translations()[key]`.
   * @param key Der Schlüssel des Übersetzungs-Strings.
   * @returns Der übersetzte String.
   */
  t(key: TranslationKey): string {
    return this.translations()[key];
  }
}