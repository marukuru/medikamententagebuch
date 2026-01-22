import { Component, ChangeDetectionStrategy, signal, effect, Renderer2, Inject, inject } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiaryListComponent } from './components/diary-list.component';
import { StatisticsComponent } from './components/statistics.component';
import { SettingsComponent } from './components/settings.component';
import { InfoComponent } from './components/info.component';
import { DataService } from './services/data.service';
import { UiService } from './services/ui.service';
import { TranslationService } from './services/translation.service';

type Page = 'diary' | 'stats' | 'settings' | 'info';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DiaryListComponent, StatisticsComponent, SettingsComponent, InfoComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
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

    // Effect to set document language
    effect(() => {
      this.renderer.setAttribute(this.document.documentElement, 'lang', this.translationService.language());
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

  // Close kebab menu when clicking/touching outside.
  closeMenu(): void {
    // If menuOpen is a function (used in template as menuOpen()), call toggleMenu() to close.
    if (typeof (this as any).menuOpen === 'function') {
      if ((this as any).menuOpen()) {
        (this as any).toggleMenu();
      }
      return;
    }

    // Fallback: if there's a boolean property named `menuOpen`, set it to false.
    if (typeof (this as any).menuOpen === 'boolean') {
      (this as any).menuOpen = false;
    }
  }
}
