import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
// FIX: Replaced deprecated `provideExperimentalZonelessChangeDetection` with the stable `provideZonelessChangeDetection`.
import { provideZonelessChangeDetection } from '@angular/core';

import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
  ],
}).catch((err) => console.error(err));
