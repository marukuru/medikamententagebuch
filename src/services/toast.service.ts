import { Injectable, signal } from '@angular/core';

/**
 * Definiert die Struktur einer einzelnen Toast-Benachrichtigung.
 */
export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number; // Anzeigedauer in Millisekunden
}

/**
 * ToastService verwaltet das Anzeigen und Ausblenden von
 * temporären Benachrichtigungen (Toasts) für den Benutzer.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /**
   * Ein Signal, das ein Array aller aktuell sichtbaren Toasts enthält.
   * Die ToastComponent reagiert auf Änderungen in diesem Signal.
   */
  toasts = signal<Toast[]>([]);
  private lastId = 0;

  /**
   * Zeigt einen neuen Toast an.
   * @param message Die anzuzeigende Nachricht.
   * @param type Der Typ des Toasts (beeinflusst die Farbe).
   * @param duration Wie lange der Toast sichtbar bleibt (in ms). 0 für unendlich.
   */
  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {
    const id = this.lastId++;
    const newToast: Toast = { id, message, type, duration };
    
    // Fügt den neuen Toast zum Array hinzu
    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    // Setzt einen Timer, um den Toast nach der angegebenen Dauer zu entfernen
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  /**
   * Shortcut-Methode für Erfolgsmeldungen.
   */
  showSuccess(message: string, duration: number = 3000) {
    this.show(message, 'success', duration);
  }

  /**
   * Shortcut-Methode für Fehlermeldungen.
   */
  showError(message: string, duration: number = 5000) {
    this.show(message, 'error', duration);
  }

  /**
   * Entfernt einen Toast aus der Liste der sichtbaren Toasts.
   * @param id Die ID des zu entfernenden Toasts.
   */
  remove(id: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}