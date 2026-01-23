import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private lastId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {
    const id = this.lastId++;
    const newToast: Toast = { id, message, type, duration };
    
    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  showSuccess(message: string, duration: number = 3000) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration: number = 5000) {
    this.show(message, 'error', duration);
  }

  remove(id: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}
