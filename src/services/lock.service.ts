import { Injectable, signal, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { NativeBiometric } from 'capacitor-native-biometric';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';


@Injectable({ providedIn: 'root' })
export class LockService {
  private dataService = inject(DataService);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);

  isLocked = signal(false);
  isBiometricsAvailable = signal(false);
  
  private backgroundedAt: number | null = null;

  constructor() {
    this.isLocked.set(this.dataService.lockSettings().isEnabled);
    
    effect(() => {
        // If lock is disabled, make sure app is unlocked
        if (!this.dataService.lockSettings().isEnabled) {
            this.unlock();
        }
    });

    if (Capacitor.isNativePlatform()) {
        CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
                await this.handleAppResume();
            } else {
                this.backgroundedAt = Date.now();
            }
        });
        NativeBiometric.isAvailable().then(result => this.isBiometricsAvailable.set(result.isAvailable));
    }
  }

  async handleAppResume(): Promise<void> {
    const settings = this.dataService.lockSettings();
    if (!settings.isEnabled || !this.backgroundedAt) return;
    
    const timeInBackground = Date.now() - this.backgroundedAt;
    
    if (timeInBackground >= settings.timeout) {
      this.lock();
    }
    this.backgroundedAt = null;
  }
  
  lock(): void {
    this.isLocked.set(true);
  }

  unlock(): void {
    this.isLocked.set(false);
  }
  
  checkPin(pin: string): boolean {
    const settings = this.dataService.lockSettings();
    if (settings.isEnabled && settings.pin === pin) {
      this.unlock();
      return true;
    }
    return false;
  }
  
  async verifyWithBiometrics(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || !this.isBiometricsAvailable()) {
        return false;
    }
    try {
        await NativeBiometric.verifyIdentity({
            reason: this.translationService.t('biometricReason'),
            title: this.translationService.t('appName'),
        });
        this.unlock();
        return true;
    } catch (error) {
        console.error('Biometric authentication failed', error);
        // The plugin might reject on user cancellation. For now, we show a toast on any failure.
        this.toastService.showError(this.translationService.t('biometricError'));
        return false;
    }
  }
}