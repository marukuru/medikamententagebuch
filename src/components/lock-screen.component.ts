import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LockService } from '../services/lock.service';
import { TranslationService } from '../services/translation.service';

const PIN_LENGTH = 4;

@Component({
  selector: 'lock-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lock-screen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockScreenComponent {
  lockService = inject(LockService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;

  pin = signal('');
  error = signal(false);

  pinDots = computed(() => {
    return Array(PIN_LENGTH).fill(0).map((_, i) => i < this.pin().length);
  });

  constructor() {
    effect(() => {
      if (this.pin().length === PIN_LENGTH) {
        this.submitPin();
      }
    });
  }

  onKeyPress(key: string) {
    if (this.pin().length >= PIN_LENGTH) return;
    this.pin.update(p => p + key);
    this.error.set(false);
  }

  onDelete() {
    this.pin.update(p => p.slice(0, -1));
    this.error.set(false);
  }
  
  submitPin() {
    const success = this.lockService.checkPin(this.pin());
    if (!success) {
      this.error.set(true);
      setTimeout(() => {
        this.pin.set('');
        this.error.set(false);
      }, 800);
    }
  }

  async onBiometrics() {
    await this.lockService.verifyWithBiometrics();
  }
}
