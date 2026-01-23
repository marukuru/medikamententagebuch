import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService } from '../services/data.service';
import { DiaryEntry, Preparation, Manufacturer, ActiveIngredient } from '../models';
import { DiaryEntryFormComponent } from './diary-entry-form.component';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'diary-list',
  standalone: true,
  imports: [CommonModule, DatePipe, DiaryEntryFormComponent],
  templateUrl: './diary-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryListComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;

  showForm = signal(false);
  showDetail = signal<DiaryEntry | null>(null);
  editingEntry = signal<DiaryEntry | null>(null);
  entryToDeleteId = signal<string | null>(null);

  // Search & Filter
  searchTerm = signal('');
  dateFilter = signal<'all' | '7d' | '30d'>('all');

  filteredEntries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.dateFilter();
    const allEntries = this.dataService.sortedDiaryEntries();

    // 1. Apply date filter
    const dateFiltered = allEntries.filter(entry => {
      if (filter === 'all') return true;
      const entryDate = new Date(entry.datetime);
      const now = new Date();
      const daysAgo = (now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      if (filter === '7d') return daysAgo <= 7;
      if (filter === '30d') return daysAgo <= 30;
      return true;
    });

    // 2. Apply search term filter
    if (!term) {
      return dateFiltered;
    }

    return dateFiltered.filter(entry => {
      const details = this.getPreparationDetails(entry.preparationId);
      const searchCorpus = [
        entry.note || '',
        entry.mood.description,
        ...entry.effects.map(e => e.description),
        details.prep?.name || '',
        details.man?.name || '',
      ].join(' ').toLowerCase();

      return searchCorpus.includes(term);
    });
  });


  // Pagination
  private initialLoadCount = 50;
  private subsequentLoadCount = 10;
  visibleCount = signal(this.initialLoadCount);
  
  paginatedEntries = computed(() => {
    return this.filteredEntries().slice(0, this.visibleCount());
  });
  
  hasMoreEntries = computed(() => {
    return this.visibleCount() < this.filteredEntries().length;
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

  // --- Filter and Search Handlers ---
  onSearchTermChange(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.visibleCount.set(this.initialLoadCount); // Reset pagination
  }

  clearSearchTerm() {
    this.searchTerm.set('');
    this.visibleCount.set(this.initialLoadCount); // Reset pagination
  }

  setDateFilter(filter: 'all' | '7d' | '30d') {
    this.dateFilter.set(filter);
    this.visibleCount.set(this.initialLoadCount); // Reset pagination
  }
}