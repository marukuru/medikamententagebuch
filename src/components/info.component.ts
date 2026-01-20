import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'info',
  standalone: true,
  templateUrl: './info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoComponent {
  appName = 'Medikamententagebuch';
  appVersion = '1.0.0';
  author = 'u/gabbergand0lf & Angular AI Engineer';
}
