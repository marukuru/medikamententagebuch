import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'info',
  standalone: true,
  templateUrl: './info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoComponent {
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  appVersion = '1.0.0';
  author = 'u/gabbergand0lf';
}
