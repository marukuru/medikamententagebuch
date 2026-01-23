import { Injectable, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TranslationService } from './translation.service';
import { ToastService } from './toast.service';

/**
 * NotificationService verwaltet die Planung und Synchronisierung von
 * lokalen Benachrichtigungen basierend auf den Erinnerungen des Benutzers.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private dataService = inject(DataService);
    private translationService = inject(TranslationService);
    private toastService = inject(ToastService);

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
     * @returns `true`, wenn die Berechtigung erteilt wurde, andernfalls `false`.
     */
    async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return true; // Im Web immer "erfolgreich"

        let status = await LocalNotifications.checkPermissions();
        if (status.display === 'granted') {
            return true;
        }
        status = await LocalNotifications.requestPermissions();
        if (status.display === 'denied') {
            this.toastService.showError(this.translationService.t('notificationPermissionDenied'));
            return false;
        }
        return true;
    }

    /**
     * Synchronisiert die im System geplanten Benachrichtigungen mit der Liste der
     * konfigurierten Erinnerungen. Alte Benachrichtigungen werden gelöscht und neue
     * basierend auf den aktuellen Daten geplant.
     */
    async syncNotifications(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        const reminders = this.dataService.reminders();
        const t = this.translationService.translations();
        const status = await LocalNotifications.checkPermissions();

        // Wenn keine Berechtigung vorliegt, brechen wir ab. Wir fragen hier nicht erneut,
        // da dies nur als Reaktion auf eine Datenänderung im Hintergrund geschieht.
        if (status.display !== 'granted') {
            console.log('Notification permission not granted. Skipping sync.');
            return;
        }

        try {
            // Alle zuvor geplanten Benachrichtigungen löschen, um Duplikate zu vermeiden
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }

            if (reminders.length === 0) return;

            // Für jede Erinnerung und jeden ausgewählten Tag eine neue Benachrichtigung planen
            const notificationsToSchedule = [];
            for (const reminder of reminders) {
                const [hour, minute] = reminder.time.split(':').map(Number);
                for (const day of reminder.days) {
                    // Erstellt eine eindeutige numerische ID für jede geplante Benachrichtigung
                    const notificationId = parseInt(reminder.id.substring(0, 6), 36) + day;
                    notificationsToSchedule.push({
                        id: notificationId,
                        title: t.notificationTitle,
                        body: t.notificationBody,
                        schedule: {
                            on: {
                                weekday: day,
                                hour: hour,
                                minute: minute,
                            },
                            repeats: true, // Die Benachrichtigung wird wöchentlich wiederholt
                        },
                        smallIcon: 'ic_stat_icon_config_material',
                        sound: 'default'
                    });
                }
            }
            
            await LocalNotifications.schedule({ notifications: notificationsToSchedule });
            console.log('Successfully scheduled notifications:', notificationsToSchedule.length);

        } catch (error) {
            console.error('Error syncing notifications:', error);
        }
    }
}