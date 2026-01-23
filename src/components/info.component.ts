import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { NgOptimizedImage } from '@angular/common';
// Importiert Metadaten direkt aus den JSON-Dateien
import { version } from '../../package.json';
import metadata from '../../metadata.json';

/**
 * InfoComponent zeigt grundlegende Informationen über die App an,
 * wie Version und Autor.
 */
@Component({
  selector: 'info',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoComponent {
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  // Liest die App-Version aus der package.json
  appVersion = version;
  // Liest den Autor aus der metadata.json
  author = metadata.author;
}