import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMOJI_DATA } from '../emoji-data';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'emoji-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emoji-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPickerComponent {
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  emojiSelect = output<string>();
  close = output<void>();

  categories = EMOJI_DATA;

  selectEmoji(emoji: string) {
    this.emojiSelect.emit(emoji);
  }

  closePicker() {
    this.close.emit();
  }

  getCategoryName(key: string): string {
    // Greift auf den Übersetzungsschlüssel zu, um den lokalisierten Kategorienamen zu erhalten
    return (this.t() as any)[key] || key;
  }
}