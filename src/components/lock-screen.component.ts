import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LockService } from '../services/lock.service';
import { TranslationService } from '../services/translation.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFingerprint, faDeleteLeft } from '@fortawesome/free-solid-svg-icons';

const PIN_LENGTH = 4;

/**
 * LockScreenComponent ist der Sperrbildschirm, der angezeigt wird, wenn die App gesperrt ist.
 * Er ermöglicht die Eingabe einer PIN oder die Verwendung von Biometrie zum Entsperren.
 */
@Component({
  selector: 'lock-screen',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './lock-screen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockScreenComponent {
  lockService = inject(LockService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;

  // --- Icons ---
  faFingerprint = faFingerprint;
  faDeleteLeft = faDeleteLeft;

  pin = signal(''); // Das Signal für die aktuelle PIN-Eingabe
  error = signal(false); // Signal, um den Fehlerzustand (z.B. für die Shake-Animation) zu steuern

  /**
   * Ein Computed Signal, das ein Array von Booleans für die PIN-Punkte generiert.
   * `true` bedeutet, der Punkt ist ausgefüllt, `false` bedeutet leer.
   */
  pinDots = computed(() => {
    return Array(PIN_LENGTH).fill(0).map((_, i) => i < this.pin().length);
  });

  constructor() {
    // Ein `effect`, der die PIN automatisch überprüft, sobald die erforderliche Länge erreicht ist.
    effect(() => {
      if (this.pin().length === PIN_LENGTH) {
        this.submitPin();
      }
    });
  }

  /**
   * Fügt eine Ziffer zur PIN hinzu.
   * @param key Die gedrückte Ziffer als String.
   */
  onKeyPress(key: string) {
    if (this.pin().length >= PIN_LENGTH) return;
    this.pin.update(p => p + key);
    this.error.set(false); // Fehlerzustand bei neuer Eingabe zurücksetzen
  }

  /**
   * Löscht die letzte Ziffer der PIN.
   */
  onDelete() {
    this.pin.update(p => p.slice(0, -1));
    this.error.set(false);
  }
  
  /**
   * Überprüft die eingegebene PIN über den LockService.
   * Bei einer falschen PIN wird der Fehlerzustand aktiviert und die Eingabe nach einer kurzen Verzögerung zurückgesetzt.
   */
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

  /**
   * Löst die biometrische Authentifizierung aus.
   */
  async onBiometrics() {
    await this.lockService.verifyWithBiometrics();
  }
}