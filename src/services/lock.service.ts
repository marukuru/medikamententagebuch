import { Injectable, signal, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { NativeBiometric } from 'capacitor-native-biometric';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

/**
 * LockService verwaltet die App-Sperre (PIN und Biometrie).
 * Er reagiert auf den App-Lebenszyklus, um die App bei Bedarf zu sperren,
 * und stellt Methoden zur Überprüfung der PIN und zur biometrischen Authentifizierung bereit.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  private dataService = inject(DataService);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);

  /**
   * Signal, das angibt, ob die App aktuell gesperrt ist und der LockScreen angezeigt werden soll.
   */
  isLocked = signal(false);
  /**
   * Signal, das anzeigt, ob biometrische Authentifizierung auf dem Gerät verfügbar ist.
   */
  isBiometricsAvailable = signal(false);
  
  private backgroundedAt: number | null = null; // Zeitpunkt, zu dem die App in den Hintergrund ging
  /**
   * Ein Flag, um eine Race Condition zu verhindern. Wenn `true`, wird die App nicht
   * gesperrt, auch wenn sie aus dem Hintergrund kommt. Dies ist notwendig, da der
   * Biometrie-Dialog die App kurz in den Hintergrund versetzt.
   */
  private isVerifyingBiometrics = false;

  constructor() {
    // Initialisiert den Sperrzustand basierend auf den Einstellungen beim App-Start.
    this.isLocked.set(this.dataService.lockSettings().isEnabled);
    
    effect(() => {
        // Wenn die App-Sperre in den Einstellungen deaktiviert wird,
        // wird die App sofort entsperrt.
        if (!this.dataService.lockSettings().isEnabled) {
            this.unlock();
        }
    });

    if (Capacitor.isNativePlatform()) {
        // Lauscht auf Änderungen des App-Zustands (Vordergrund/Hintergrund).
        CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
                // App kommt in den Vordergrund
                await this.handleAppResume();
            } else {
                // App geht in den Hintergrund
                this.backgroundedAt = Date.now();
            }
        });
        // Prüft, ob Biometrie verfügbar ist, und setzt das Signal entsprechend.
        NativeBiometric.isAvailable().then(result => this.isBiometricsAvailable.set(result.isAvailable));
    }
  }

  /**
   * Wird aufgerufen, wenn die App in den Vordergrund kommt.
   * Prüft, ob die App basierend auf dem Timeout gesperrt werden muss.
   */
  async handleAppResume(): Promise<void> {
    if (this.isVerifyingBiometrics) return; // Verhindert erneutes Sperren während der Biometrie-Prüfung

    const settings = this.dataService.lockSettings();
    if (!settings.isEnabled || !this.backgroundedAt) return;
    
    const timeInBackground = Date.now() - this.backgroundedAt;
    
    // Sperrt die App, wenn die Zeit im Hintergrund länger als der eingestellte Timeout war.
    if (timeInBackground >= settings.timeout) {
      this.lock();
    }
    this.backgroundedAt = null;
  }
  
  /**
   * Sperrt die App, indem `isLocked` auf `true` gesetzt wird.
   */
  lock(): void {
    this.isLocked.set(true);
  }

  /**
   * Entsperrt die App.
   */
  unlock(): void {
    this.isLocked.set(false);
  }
  
  /**
   * Überprüft die eingegebene PIN gegen die gespeicherte PIN.
   * @param pin Die zu überprüfende PIN.
   * @returns `true`, wenn die PIN korrekt ist, andernfalls `false`.
   */
  checkPin(pin: string): boolean {
    const settings = this.dataService.lockSettings();
    if (settings.isEnabled && settings.pin === pin) {
      this.unlock();
      return true;
    }
    return false;
  }
  
  /**
   * Startet den biometrischen Authentifizierungsprozess des Geräts.
   * @returns Eine Promise, die `true` bei Erfolg oder `false` bei Fehler/Abbruch zurückgibt.
   */
  async verifyWithBiometrics(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || !this.isBiometricsAvailable()) {
        return false;
    }
    this.isVerifyingBiometrics = true;
    try {
        // Ruft den nativen Biometrie-Dialog auf.
        await NativeBiometric.verifyIdentity({
            reason: this.translationService.t('biometricReason'),
            title: this.translationService.t('appName'),
        });
        this.unlock();
        return true;
    } catch (error) {
        console.error('Biometric authentication failed', error);
        // Das Plugin lehnt auch bei Abbruch durch den Benutzer ab.
        // Wir zeigen bei jedem Fehler eine Toast-Benachrichtigung an.
        this.toastService.showError(this.translationService.t('biometricError'));
        return false;
    } finally {
        // Das Flag wird im `finally`-Block zurückgesetzt, um sicherzustellen,
        // dass es auch bei Fehlern wieder auf `false` gesetzt wird.
        this.isVerifyingBiometrics = false;
    }
  }
}