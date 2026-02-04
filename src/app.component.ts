import { Component, ChangeDetectionStrategy, signal, effect, Renderer2, Inject, inject, NgZone, computed } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiaryListComponent } from './components/diary-list.component';
import { StatisticsComponent } from './components/statistics.component';
import { SettingsComponent } from './components/settings.component';
import { InfoComponent } from './components/info.component';
import { LockScreenComponent } from './components/lock-screen.component';
import { DataService } from './services/data.service';
import { UiService } from './services/ui.service';
import { TranslationService } from './services/translation.service';
import { ToastComponent } from './components/toast.component';
import { LockService } from './services/lock.service';
import { NotificationService } from './services/notification.service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ActionPerformed } from '@capacitor/local-notifications';
import { Page } from './models';
import { EmojiPickerComponent } from './components/emoji-picker.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

/**
 * AppComponent ist die Wurzelkomponente der Anwendung.
 * Sie verwaltet das Hauptlayout, die Navigation zwischen den Seiten
 * und die globalen UI-Zustände wie das Theme oder das Menü.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DiaryListComponent, StatisticsComponent, SettingsComponent, InfoComponent, ToastComponent, LockScreenComponent, EmojiPickerComponent, FontAwesomeModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);
  // LockService hier initialisieren, um die App-Sperrlogik beim Start zu aktivieren
  lockService = inject(LockService);
  // NotificationService hier initialisieren, um den Listener für Erinnerungen zu aktivieren
  notificationService = inject(NotificationService);
  t = this.translationService.translations;
  
  // --- UI-Zustandssignale ---
  currentPage = signal<Page>('diary'); // Die aktuell angezeigte Seite
  menuOpen = signal(false); // Zustand des Kebab-Menüs in der Kopfzeile

  // --- Emoji Picker State ---
  showEmojiPicker = signal(false);
  emojiTargetField = signal<'mood' | 'effect' | 'symptom' | 'activity' | null>(null);

  // --- Icons ---
  faEllipsisV = faEllipsisV;

  /**
   * Ein Computed Signal, das den Titel und das Emoji der aktuellen Seite zurückgibt.
   */
  currentPageInfo = computed(() => {
    const page = this.currentPage();
    const t = this.t();
    switch (page) {
      case 'diary':
        return { title: t.diaryListTitle, emoji: '💊' };
      case 'stats':
        return { title: t.statisticsTitle, emoji: '📊' };
      case 'settings':
        return { title: t.settingsTitle, emoji: '⚙️' };
      case 'info':
        return { title: t.info, emoji: 'ℹ️' };
      default: // Sollte nicht eintreten
        return { title: t.appName, emoji: '💊' };
    }
  });

  constructor(
    private renderer: Renderer2, 
    @Inject(DOCUMENT) private document: Document,
    private zone: NgZone
    ) {
    // Dieser `effect` reagiert auf Änderungen des Theme-Signals im DataService.
    // Er fügt die 'dark'-Klasse zum <html>-Element hinzu oder entfernt sie,
    // um das Dark-Mode-Styling von Tailwind CSS zu aktivieren/deaktivieren.
    effect(() => {
      const currentTheme = this.dataService.theme();
      if (currentTheme === 'dark') {
        this.renderer.addClass(this.document.documentElement, 'dark');
      } else {
        this.renderer.removeClass(this.document.documentElement, 'dark');
      }
    });

    // Dieser `effect` setzt das `lang`-Attribut des <html>-Elements,
    // um die korrekte Sprache für Barrierefreiheit und Browserfunktionen anzugeben.
    effect(() => {
      this.renderer.setAttribute(this.document.documentElement, 'lang', this.translationService.language());
    });

    // Dieser `effect` reagiert auf Navigationsanfragen aus dem UiService.
    effect(() => {
      const page = this.uiService.navigateToPage();
      if (page) {
        this.navigate(page);
        this.uiService.navigateToPage.set(null); // Den Auslöser zurücksetzen
      }
    }, { allowSignalWrites: true });

    if (Capacitor.isNativePlatform()) {
      this.setupNotificationListener();
    }
  }

  /**
   * Richtet einen Listener ein, der auf das Antippen von Benachrichtigungen reagiert.
   */
  private setupNotificationListener() {
    LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
      // action.actionId ist 'tap', wenn der Benachrichtigungstext angetippt wurde
      const extraData = action.notification.extra;
      if (action.actionId === 'tap' && extraData?.action === 'open_entry_form') {
        // Muss in der Angular-Zone ausgeführt werden, um die Change Detection auszulösen
        this.zone.run(() => {
          console.log('Reminder notification tapped, opening diary entry form.');
          this.uiService.navigateToPage.set('diary');
          this.uiService.requestDiaryFormOpen.set(true);
        });
      }
    });
  }

  /**
   * Navigiert zu einer bestimmten Seite und schließt das Menü.
   * @param page Die Seite, zu der navigiert werden soll.
   */
  navigate(page: Page) {
    this.currentPage.set(page);
    this.menuOpen.set(false);
  }

  /**
   * Schaltet den Zustand des Kebab-Menüs um (offen/geschlossen).
   */
  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  /**
   * Schließt das Kebab-Menü. Diese Methode wird durch einen Klick auf den
   * Haupt-Container der App ausgelöst, um das Menü zu schließen, wenn man
   * außerhalb davon klickt.
   */
  closeMenu(): void {
    if (this.menuOpen()) {
        this.menuOpen.set(false);
    }
  }

  // --- Emoji Picker Methods ---
  openEmojiPicker(target: 'mood' | 'effect' | 'symptom' | 'activity') {
    this.emojiTargetField.set(target);
    this.showEmojiPicker.set(true);
  }

  closeEmojiPicker() {
    this.showEmojiPicker.set(false);
    this.emojiTargetField.set(null);
  }

  onEmojiSelected(emoji: string) {
    const target = this.emojiTargetField();
    if (target === 'mood') {
      this.uiService.moodForm.update(form => ({...form, emoji}));
    } else if (target === 'effect') {
      this.uiService.effectForm.update(form => ({...form, emoji}));
    } else if (target === 'symptom') {
        this.uiService.symptomForm.update(form => ({ ...form, emoji }));
    } else if (target === 'activity') {
        this.uiService.activityForm.update(form => ({ ...form, emoji }));
    }
    this.closeEmojiPicker();
  }
}