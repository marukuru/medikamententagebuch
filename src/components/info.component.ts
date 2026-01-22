import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { NgOptimizedImage } from '@angular/common';
import { version } from '../../package.json';

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
  
  appVersion = version;
  author = 'u/gabbergand0lf';
}
