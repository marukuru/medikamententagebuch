import { Component, ChangeDetectionStrategy, signal, effect, Renderer2, Inject, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DiaryListComponent } from './components/diary-list.component';
import { StatisticsComponent } from './components/statistics.component';
import { SettingsComponent } from './components/settings.component';
import { InfoComponent } from './components/info.component';
import { DataService } from './services/data.service';

type Page = 'diary' | 'stats' | 'settings' | 'info';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DiaryListComponent, StatisticsComponent, SettingsComponent, InfoComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  dataService = inject(DataService);
  currentPage = signal<Page>('diary');
  menuOpen = signal(false);

  constructor(private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {
    // Effect to apply theme to document
    effect(() => {
      const currentTheme = this.dataService.theme();
      if (currentTheme === 'dark') {
        this.renderer.addClass(this.document.documentElement, 'dark');
      } else {
        this.renderer.removeClass(this.document.documentElement, 'dark');
      }
    });
  }

  navigate(page: Page) {
    this.currentPage.set(page);
    this.menuOpen.set(false);
  }

  toggleTheme() {
    this.dataService.toggleTheme();
  }
  
  toggleMenu() {
    this.menuOpen.update(open => !open);
  }
}