import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
// Hier muss provideZoneChangeDetection genutzt werden, sonst kommt es zu Build-Fehler!
import { provideZoneChangeDetection } from '@angular/core';

import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
  ],
}).catch((err) => console.error(err));
