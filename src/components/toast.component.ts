import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faCheckCircle, faTimesCircle, faInfoCircle, faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * ToastComponent ist eine reine Präsentationskomponente, die die
 * im ToastService verwalteten Benachrichtigungen auf der UI darstellt.
 */
@Component({
  selector: 'toast-notifications',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  toastService = inject(ToastService);
  faXmark = faXmark;

  /**
   * Gibt die entsprechende Font-Awesome-Icon-Definition für einen Toast-Typ zurück.
   * @param type Der Typ des Toasts.
   * @returns Die Icon-Definition.
   */
  getIcon(type: 'success' | 'error' | 'info'): IconDefinition {
    switch (type) {
      case 'success': return faCheckCircle;
      case 'error': return faTimesCircle;
      case 'info': return faInfoCircle;
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