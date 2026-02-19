import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { NgOptimizedImage } from '@angular/common';
// Importiert Metadaten direkt aus der package.json
import { version } from '../../package.json';

/**
 * InfoComponent zeigt grundlegende Informationen über die App an,
 * wie z.B. die Version.
 */
@Component({
  selector: 'info',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Stellt sicher, dass die Komponente als Block-Element die volle Höhe einnimmt,
    // was für die vertikale Zentrierung im Flex-Layout des Templates notwendig ist.
    class: 'block h-full',
  },
})
export class InfoComponent {
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  // Liest die App-Version aus der package.json
  appVersion = version;
}