import 'zone.js';
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';

import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
  ],
}).catch((err) => console.error(err));