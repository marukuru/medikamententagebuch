import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

/**
 * ToastComponent ist eine reine Präsentationskomponente, die die
 * im ToastService verwalteten Benachrichtigungen auf der UI darstellt.
 */
@Component({
  selector: 'toast-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  toastService = inject(ToastService);

  /**
   * Gibt die entsprechende Font-Awesome-Icon-Klasse für einen Toast-Typ zurück.
   * @param type Der Typ des Toasts.
   * @returns Die CSS-Klasse für das Icon.
   */
  getIconClass(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success': return 'fa-solid fa-check-circle';
      case 'error': return 'fa-solid fa-times-circle';
      case 'info': return 'fa-solid fa-info-circle';
    }
  }

  /**
   * Gibt die entsprechende Tailwind-CSS-Hintergrundklasse für einen Toast-Typ zurück.
   * @param type Der Typ des Toasts.
   * @returns Die CSS-Klasse für den Hintergrund.
   */
  getContainerClass(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'info': return 'bg-blue-600';
    }
  }
}