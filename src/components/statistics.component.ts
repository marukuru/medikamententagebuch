import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { Manufacturer, ActiveIngredient, Preparation, EffectPerception } from '../models';

interface PreparationStat {
  prep: Preparation;
  // FIX: Changed optional properties to be explicitly typed as potentially undefined.
  // This aligns the interface with the object structure created in `getSortedPrepStats`,
  // which always includes these properties, even if their values are undefined.
  man: Manufacturer | undefined;
  ai: ActiveIngredient | undefined;
  count: number;
}

@Component({
  selector: 'statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
  dataService = inject(DataService);
  
  topPreparations = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.dataService.diaryEntries()) {
      if (entry.preparationId) {
        counts.set(entry.preparationId, (counts.get(entry.preparationId) || 0) + 1);
      }
    }
    return this.getSortedPrepStats(counts).slice(0, 5);
  });

  moodStats = computed(() => {
    const stats = new Map<string, { moodName: string, emoji: string, counts: Map<string, number> }>();
    for (const entry of this.dataService.diaryEntries()) {
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

  categorizedEffectStats = computed(() => {
    const stats = new Map<string, { 
      effectName: string, 
      emoji: string, 
      perception: EffectPerception, 
      counts: Map<string, number> 
    }>();

    for (const entry of this.dataService.diaryEntries()) {
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
}