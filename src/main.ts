// --- App-Einstiegspunkt ---

// Der Angular-Compiler wird für das Just-in-Time (JIT) Kompilieren benötigt,
// was in dieser Konfiguration im Browser geschieht.
import '@angular/compiler';

import { bootstrapApplication } from '@angular/platform-browser';
// FIX: Replaced deprecated `provideExperimentalZonelessChangeDetection` with `provideZonelessChangeDetection`.
import { provideZonelessChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

import { AppComponent } from './app.component';

// Registriert die deutschen Lokalisierungsdaten, damit die DatePipe sie verwenden kann.
registerLocaleData(localeDe);

// `bootstrapApplication` startet die Angular-Anwendung.
// Es nimmt die Wurzelkomponente (AppComponent) als Argument.
bootstrapApplication(AppComponent, {
  // `providers` konfiguriert die Dependency Injection für die Anwendung.
  providers: [
    // `provideZonelessChangeDetection` aktiviert die neue, zoneless
    // Change Detection Strategie von Angular.
    provideZonelessChangeDetection(),
  ],
}).catch((err) => console.error(err)); // Fehler beim Starten der App werden in der Konsole ausgegeben.