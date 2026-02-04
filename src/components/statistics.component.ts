import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { Manufacturer, ActiveIngredient, Preparation, EffectPerception, Symptom, Activity } from '../models';
import { TranslationService } from '../services/translation.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

/**
 * Interface zur Strukturierung von Präparat-Statistiken, inklusive zugehöriger Details.
 */
interface PreparationStat {
  prep: Preparation;
  man: Manufacturer | undefined;
  ai: ActiveIngredient | undefined;
  count: number;
}

/**
 * StatisticsComponent zeigt verschiedene Auswertungen und Statistiken basierend
 * auf den Tagebucheinträgen an.
 */
@Component({
  selector: 'statistics',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  // --- Icons ---
  faFilter = faFilter;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;

  // --- UI & Filter-Zustand ---
  showFilters = signal(false);
  dateFilter = signal<'all' | '7d' | '30d'>('all');
  yearFilter = signal<number | 'all'>('all');

  /**
   * Berechnet die verfügbaren Jahre aus den Tagebucheinträgen für den Filter.
   */
  availableYears = computed(() => {
    const years = this.dataService.diaryEntries()
      .map(entry => new Date(entry.datetime).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  });

  /**
   * Ein Computed Signal, das die Tagebucheinträge basierend auf dem aktuellen
   * Datums- oder Jahresfilter filtert. Dies ist die Datenquelle für alle Statistiken.
   */
  filteredEntries = computed(() => {
    const dateF = this.dateFilter();
    const yearF = this.yearFilter();
    const allEntries = this.dataService.diaryEntries();

    if (yearF !== 'all') {
      return allEntries.filter(entry => new Date(entry.datetime).getFullYear() === yearF);
    } else {
      return allEntries.filter(entry => {
        if (dateF === 'all') return true;
        const entryDate = new Date(entry.datetime);
        const now = new Date();
        // FIX: Explicitly cast Date objects to numbers for arithmetic operation to prevent type errors.
        const daysAgo = (Number(now) - Number(entryDate)) / (1000 * 3600 * 24);
        if (dateF === '7d') return daysAgo <= 7;
        if (dateF === '30d') return daysAgo <= 30;
        return true;
      });
    }
  });
  
  /**
   * Berechnet die 5 am häufigsten verwendeten Präparate basierend auf den gefilterten Einträgen.
   */
  topPreparations = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.filteredEntries()) {
      if (entry.preparationId) {
        counts.set(entry.preparationId, (counts.get(entry.preparationId) || 0) + 1);
      }
    }
    return this.getSortedPrepStats(counts).slice(0, 5);
  });

  /**
   * Berechnet, welche Präparate am häufigsten bei bestimmten Stimmungen eingenommen wurden.
   */
  moodStats = computed(() => {
    const stats = new Map<string, { moodName: string, emoji: string, counts: Map<string, number> }>();
    for (const entry of this.filteredEntries()) {
      if (!entry.preparationId) continue;
      
      if (!stats.has(entry.mood.id)) {
        stats.set(entry.mood.id, { moodName: entry.mood.description, emoji: entry.mood.emoji, counts: new Map() });
      }
      
      const moodStat = stats.get(entry.mood.id)!;
      moodStat.counts.set(entry.preparationId, (moodStat.counts.get(entry.preparationId) || 0) + 1);
    }

    const result: { moodName: string, emoji: string, topPreps: PreparationStat[] }[] = [];
    stats.forEach((value) => {
      result.push({
        moodName: value.moodName,
        emoji: value.emoji,
        topPreps: this.getSortedPrepStats(value.counts).slice(0, 5),
      });
    });
    return result;
  });

  /**
   * Berechnet, welche Präparate am häufigsten mit bestimmten Effekten assoziiert sind.
   */
  categorizedEffectStats = computed(() => {
    const stats = new Map<string, { 
      effectName: string, 
      emoji: string, 
      perception: EffectPerception, 
      counts: Map<string, number> 
    }>();

    for (const entry of this.filteredEntries()) {
      if (!entry.preparationId) continue;

      for (const effect of entry.effects) {
        if (!stats.has(effect.id)) {
          stats.set(effect.id, { 
            effectName: effect.description, 
            emoji: effect.emoji, 
            perception: effect.perception, 
            counts: new Map() 
          });
        }
        const effectStat = stats.get(effect.id)!;
        effectStat.counts.set(entry.preparationId, (effectStat.counts.get(entry.preparationId) || 0) + 1);
      }
    }
    
    const result: { 
      positive: { effectName: string, emoji: string, topPreps: PreparationStat[] }[],
      negative: { effectName: string, emoji: string, topPreps: PreparationStat[] }[],
    } = { positive: [], negative: [] };

    stats.forEach((value) => {
      const statObject = {
        effectName: value.effectName,
        emoji: value.emoji,
        topPreps: this.getSortedPrepStats(value.counts).slice(0, 5)
      };

      if (statObject.topPreps.length > 0) {
          switch(value.perception) {
            case 'positive':
              result.positive.push(statObject);
              break;
            case 'negative':
              result.negative.push(statObject);
              break;
          }
      }
    });

    return result;
  });

  /**
   * Berechnet, welche Präparate bei bestimmten Symptomen positive Effekte gezeigt haben.
   */
  symptomReliefStats = computed(() => {
    const stats = new Map<string, { symptom: Symptom, prepCounts: Map<string, number> }>();

    for (const entry of this.filteredEntries()) {
      const hasPositiveEffect = entry.effects.some(e => e.perception === 'positive');
      if (!entry.symptomIds || entry.symptomIds.length === 0 || !entry.preparationId || !hasPositiveEffect) {
        continue;
      }
      
      for (const symptomId of entry.symptomIds) {
        if (!stats.has(symptomId)) {
          const symptom = this.dataService.symptoms().find(s => s.id === symptomId);
          if (symptom) {
             stats.set(symptomId, { symptom: symptom, prepCounts: new Map() });
          }
        }
        
        const symptomStat = stats.get(symptomId);
        if (symptomStat) {
          symptomStat.prepCounts.set(entry.preparationId, (symptomStat.prepCounts.get(entry.preparationId) || 0) + 1);
        }
      }
    }
    
    const result: { symptom: Symptom, topPreps: PreparationStat[] }[] = [];
    stats.forEach((value) => {
        const topPreps = this.getSortedPrepStats(value.prepCounts);
        if (topPreps.length > 0) {
            result.push({
                symptom: value.symptom,
                topPreps: topPreps.slice(0, 5),
            });
        }
    });

    return result;
  });

  /**
   * Berechnet, welche Präparate bei bestimmten Aktivitäten positive Effekte gezeigt haben.
   */
  activityEffectStats = computed(() => {
    const stats = new Map<string, { activity: Activity, prepCounts: Map<string, number> }>();

    for (const entry of this.filteredEntries()) {
      const hasPositiveEffect = entry.effects.some(e => e.perception === 'positive');
      if (!entry.activityIds || entry.activityIds.length === 0 || !entry.preparationId || !hasPositiveEffect) {
        continue;
      }
      
      for (const activityId of entry.activityIds) {
        if (!stats.has(activityId)) {
          const activity = this.dataService.activities().find(a => a.id === activityId);
          if (activity) {
             stats.set(activityId, { activity, prepCounts: new Map() });
          }
        }
        
        const activityStat = stats.get(activityId);
        if (activityStat) {
          activityStat.prepCounts.set(entry.preparationId, (activityStat.prepCounts.get(entry.preparationId) || 0) + 1);
        }
      }
    }
    
    const result: { activity: Activity, topPreps: PreparationStat[] }[] = [];
    stats.forEach((value) => {
        const topPreps = this.getSortedPrepStats(value.prepCounts);
        if (topPreps.length > 0) {
            result.push({
                activity: value.activity,
                topPreps: topPreps.slice(0, 5),
            });
        }
    });

    return result;
  });

  private getSortedPrepStats(counts: Map<string, number>): PreparationStat[] {
    return Array.from(counts.entries())
      .map(([prepId, count]) => {
        const prep = this.dataService.preparations().find(p => p.id === prepId);
        if (!prep) return null;
        const man = this.dataService.manufacturers().find(m => m.id === prep.manufacturerId);
        const ai = this.dataService.activeIngredients().find(a => a.id === prep.activeIngredientId);
        return { prep, man, ai, count };
      })
      .filter((item): item is PreparationStat => item !== null)
      .sort((a, b) => b.count - a.count);
  }
  
  // --- Filter-Methoden ---
  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  setDateFilter(filter: 'all' | '7d' | '30d') {
    this.dateFilter.set(filter);
    this.yearFilter.set('all');
  }

  setYearFilter(year: number | 'all') {
    this.yearFilter.set(year);
    this.dateFilter.set('all');
  }

  onYearFilterChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    const year = selectedValue === 'all' ? 'all' : parseInt(selectedValue, 10);
    this.setYearFilter(year);
  }
}