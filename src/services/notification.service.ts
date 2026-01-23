import { Injectable, inject, effect, NgZone } from '@angular/core';
import { DataService } from './data.service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TranslationService } from './translation.service';
import { ToastService } from './toast.service';
import { UiService } from './ui.service';

/**
 * NotificationService verwaltet die Planung und Synchronisierung von
 * lokalen Benachrichtigungen basierend auf den Erinnerungen des Benutzers.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private dataService = inject(DataService);
    private translationService = inject(TranslationService);
    private toastService = inject(ToastService);
    private uiService = inject(UiService);
    private zone = inject(NgZone);
    
    // Hält die IDs der `setTimeout`-Aufrufe für die Web-Implementierung
    private webTimeoutIds: number[] = [];

    constructor() {
        // Dieser `effect` wird immer dann ausgeführt, wenn sich die Erinnerungen im DataService ändern.
        // Er sorgt dafür, dass die geplanten System-Benachrichtigungen immer auf dem neuesten Stand sind.
        effect(() => {
            const reminders = this.dataService.reminders();
            console.log('Reminders changed, syncing notifications...', reminders);
            this.syncNotifications();
        });
    }

    /**
     * Fordert die Berechtigung zum Senden von Benachrichtigungen an.
     * Funktioniert sowohl für native Plattformen (Capacitor) als auch für den Webbrowser.
     * @returns `true`, wenn die Berechtigung erteilt wurde, andernfalls `false`.
     */
    async requestPermissions(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            let status = await LocalNotifications.checkPermissions();
            if (status.display === 'granted') {
                return true;
            }
            status = await LocalNotifications.requestPermissions();
            if (status.display === 'denied') {
                this.toastService.showError(this.translationService.t('notificationPermissionDenied'));
                return false;
            }
            return status.display === 'granted';
        } else {
            // Web Notifications API Implementierung
            if (typeof Notification === 'undefined') {
                console.error('Web Notifications API not supported in this browser.');
                return false;
            }
            if (Notification.permission === 'granted') {
                return true;
            }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.toastService.showError(this.translationService.t('notificationPermissionDenied'));
                return false;
            }
            return true;
        }
    }
    
    /**
     * Zeigt eine Web-Benachrichtigung an und fügt einen Klick-Handler hinzu.
     */
    private showWebNotification(): void {
        const t = this.translationService.translations();
        const notification = new Notification(t.notificationTitle, {
            body: t.notificationBody,
            icon: 'icon.svg'
        });

        // Handler für Klick-Events auf die Benachrichtigung
        notification.onclick = () => {
            this.zone.run(() => {
                // Fokussiert das Fenster/Tab der App
                window.focus(); 
                console.log('Web notification tapped, opening diary entry form.');
                // Löst die Navigation und das Öffnen des Formulars über den UiService aus
                this.uiService.navigateToPage.set('diary');
                this.uiService.requestDiaryFormOpen.set(true);
            });
        };
    }

    /**
     * Synchronisiert die im System geplanten Benachrichtigungen mit der Liste der
     * konfigurierten Erinnerungen. Alte Benachrichtigungen werden gelöscht und neue
     * basierend auf den aktuellen Daten geplant.
     */
    async syncNotifications(): Promise<void> {
        if (Capacitor.isNativePlatform()) {
            // --- Native Implementierung ---
            const reminders = this.dataService.reminders();
            const t = this.translationService.translations();
            const status = await LocalNotifications.checkPermissions();

            if (status.display !== 'granted') {
                console.log('Notification permission not granted. Skipping sync.');
                return;
            }

            try {
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length > 0) {
                    await LocalNotifications.cancel(pending);
                }

                if (reminders.length === 0) return;

                const notificationsToSchedule = [];
                for (const reminder of reminders) {
                    const [hour, minute] = reminder.time.split(':').map(Number);
                    for (const day of reminder.days) {
                        const notificationId = parseInt(reminder.id.substring(0, 6), 36) + day;
                        notificationsToSchedule.push({
                            id: notificationId,
                            title: t.notificationTitle,
                            body: t.notificationBody,
                            schedule: { on: { weekday: day, hour, minute }, repeats: true },
                            largeIcon: 'ic_launcher', // Das Haupt-App-Icon (farbig)
                            smallIcon: 'ic_stat_pill', // Das monochrome Statusleisten-Icon
                            sound: 'default',
                            extra: {
                                action: 'open_entry_form'
                            }
                        });
                    }
                }
                
                await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                console.log('Successfully scheduled native notifications:', notificationsToSchedule.length);
            } catch (error) {
                console.error('Error syncing native notifications:', error);
            }
        } else {
            // --- Web Implementierung mit setTimeout ---
            this.webTimeoutIds.forEach(clearTimeout);
            this.webTimeoutIds = [];
            
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
                console.log('Web notification permission not granted. Skipping web sync.');
                return;
            }

            const reminders = this.dataService.reminders();
            const now = new Date();

            for (const reminder of reminders) {
                const [hour, minute] = reminder.time.split(':').map(Number);
                for (const day of reminder.days) {
                    // Capacitor weekday: 1=Sun, ..., 7=Sat | JS Date weekday: 0=Sun, ..., 6=Sat
                    const jsDay = day - 1; 

                    const nextNotificationDate = new Date(now.getTime());
                    nextNotificationDate.setHours(hour, minute, 0, 0);

                    let dayDifference = jsDay - now.getDay();
                    if (dayDifference < 0 || (dayDifference === 0 && nextNotificationDate.getTime() <= now.getTime())) {
                        dayDifference += 7;
                    }
                    
                    nextNotificationDate.setDate(now.getDate() + dayDifference);
                    const delay = nextNotificationDate.getTime() - now.getTime();
                    
                    if (delay > 0) {
                        const timeoutId = setTimeout(() => {
                            this.showWebNotification();
                            // Nach kurzer Verzögerung neu synchronisieren, um die nächste Benachrichtigung zu planen.
                            setTimeout(() => this.syncNotifications(), 1000);
                        }, delay);
                        this.webTimeoutIds.push(timeoutId as any);
                    }
                }
            }
            console.log(`Scheduled ${this.webTimeoutIds.length} web notifications.`);
        }
    }
}