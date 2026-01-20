import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Manufacturer, ActiveIngredient } from '../models';
import { DiaryEntryFormComponent } from './diary-entry-form.component';

@Component({
  selector: 'diary-list',
  standalone: true,
  imports: [CommonModule, DatePipe, DiaryEntryFormComponent],
  templateUrl: './diary-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryListComponent {
  dataService = inject(DataService);

  showForm = signal(false);
  showDetail = signal<DiaryEntry | null>(null);
  editingEntry = signal<DiaryEntry | null>(null);
  entryToDeleteId = signal<string | null>(null);

  // Pagination
  private initialLoadCount = 50;
  private subsequentLoadCount = 10;
  visibleCount = signal(this.initialLoadCount);
  
  paginatedEntries = computed(() => {
    return this.dataService.sortedDiaryEntries().slice(0, this.visibleCount());
  });
  
  hasMoreEntries = computed(() => {
    return this.visibleCount() < this.dataService.sortedDiaryEntries().length;
  });

  getPreparationDetails(prepId?: string): { prep: Preparation | undefined, man: Manufacturer | undefined, ai: ActiveIngredient | undefined } {
    if (!prepId) return { prep: undefined, man: undefined, ai: undefined };
    const prep = this.dataService.preparations().find(p => p.id === prepId);
    if (!prep) return { prep: undefined, man: undefined, ai: undefined };
    const man = this.dataService.manufacturers().find(m => m.id === prep.manufacturerId);
    const ai = this.dataService.activeIngredients().find(a => a.id === prep.activeIngredientId);
    return { prep, man, ai };
  }

  addEntry() {
    this.editingEntry.set(null);
    this.showForm.set(true);
  }

  editEntry(entry: DiaryEntry) {
    this.editingEntry.set(entry);
    this.showDetail.set(null);
    this.showForm.set(true);
  }

  viewEntry(entry: DiaryEntry) {
    this.showDetail.set(entry);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingEntry.set(null);
  }
  
  // New delete flow
  requestDeleteConfirmation(id: string) {
    this.entryToDeleteId.set(id);
  }

  cancelDelete() {
    this.entryToDeleteId.set(null);
  }

  confirmDelete() {
    const id = this.entryToDeleteId();
    if (!id) return;

    this.dataService.deleteDiaryEntry(id);
    this.showDetail.set(null);
    this.entryToDeleteId.set(null);
  }

  loadMore() {
    this.visibleCount.update(count => count + this.subsequentLoadCount);
  }
}