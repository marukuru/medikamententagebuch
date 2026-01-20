import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
// FIX: Replaced deprecated `provideExperimentalZonelessChangeDetection` with `provideZonelessChangeDetection`.
// The experimental version is no longer available in recent Angular versions.
import { provideZonelessChangeDetection } from '@angular/core';

import { AppComponent } from './src/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
  ],
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.