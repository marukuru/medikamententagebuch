// --- App-Einstiegspunkt ---

// zone.js wird für die automatische Change Detection von Angular benötigt.
import 'zone.js';
// Der Angular-Compiler wird für das Just-in-Time (JIT) Kompilieren benötigt,
// was in dieser Konfiguration im Browser geschieht.
import '@angular/compiler';

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';

import { AppComponent } from './app.component';

// `bootstrapApplication` startet die Angular-Anwendung.
// Es nimmt die Wurzelkomponente (AppComponent) als Argument.
bootstrapApplication(AppComponent, {
  // `providers` konfiguriert die Dependency Injection für die Anwendung.
  providers: [
    // `provideZoneChangeDetection` aktiviert die standardmäßige, auf zone.js basierende
    // Change Detection Strategie von Angular.
    provideZoneChangeDetection(),
  ],
}).catch((err) => console.error(err)); // Fehler beim Starten der App werden in der Konsole ausgegeben.
