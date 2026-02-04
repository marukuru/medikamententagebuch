import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMOJI_DATA } from '../emoji-data';
import { TranslationService } from '../services/translation.service';
import { DataService } from '../services/data.service';
import { UiService } from '../services/ui.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'emoji-picker',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './emoji-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPickerComponent {
  translationService = inject(TranslationService);
  dataService = inject(DataService);
  uiService = inject(UiService);
  t = this.translationService.translations;
  
  emojiSelect = output<string>();
  close = output<void>();

  categories = EMOJI_DATA;
  customEmojis = this.dataService.customEmojis;
  faPlus = faPlus;

  selectEmoji(emoji: string) {
    this.emojiSelect.emit(emoji);
  }

  closePicker() {
    this.close.emit();
  }

  openAddCustomEmojiForm() {
    this.uiService.openCreateForm('CustomEmoji');
    this.closePicker();
  }

  getCategoryName(key: string): string {
    // Greift auf den Übersetzungsschlüssel zu, um den lokalisierten Kategorienamen zu erhalten
    return (this.t() as any)[key] || key;
  }
}