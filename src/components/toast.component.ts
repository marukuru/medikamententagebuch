import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'toast-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIconClass(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success': return 'fa-solid fa-check-circle';
      case 'error': return 'fa-solid fa-times-circle';
      case 'info': return 'fa-solid fa-info-circle';
    }
  }

  getContainerClass(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'info': return 'bg-blue-600';
    }
  }
}
