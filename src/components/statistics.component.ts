import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { Manufacturer, ActiveIngredient, Preparation, EffectPerception } from '../models';
import { TranslationService } from '../services/translation.service';

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
  imports: [CommonModule],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  t = this.translationService.translations;
  
  /**
   * Berechnet die 5 am häufigsten verwendeten Präparate.
   * `computed` sorgt dafür, dass die Berechnung nur dann neu ausgeführt wird,
   * wenn sich die `diaryEntries` ändern.
   */
  topPreparations = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.dataService.diaryEntries()) {
      if (entry.preparationId) {
        counts.set(entry.preparationId, (counts.get(entry.preparationId) || 0) + 1);
      }
    }
    // `getSortedPrepStats` wandelt die Map in eine sortierte Liste um
    return this.getSortedPrepStats(counts).slice(0, 5);
  });

  /**
   * Berechnet, welche Präparate am häufigsten bei bestimmten Stimmungen eingenommen wurden.
   */
  moodStats = computed(() => {
    // Schritt 1: Gruppiere die Zählungen pro Stimmung und Präparat
    const stats = new Map<string, { moodName: string, emoji: string, counts: Map<string, number> }>();
    for (const entry of this.dataService.diaryEntries()) {
      if (!entry.preparationId) continue;
      
      if (!stats.has(entry.mood.id)) {
        stats.set(entry.mood.id, { moodName: entry.mood.description, emoji: entry.mood.emoji, counts: new Map() });
      }
      
      const moodStat = stats.get(entry.mood.id)!;
      moodStat.counts.set(entry.preparationId, (moodStat.counts.get(entry.preparationId) || 0) + 1);
    }

    // Schritt 2: Wandle die gruppierten Daten in eine anzeigbare Struktur um
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
   * Berechnet, welche Präparate am häufigsten mit bestimmten Effekten assoziiert sind,
   * getrennt nach positiver und negativer Wahrnehmung.
   */
  categorizedEffectStats = computed(() => {
    // Schritt 1: Gruppiere Zählungen pro Effekt und Präparat
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
    
    // Schritt 2: Formatiere und kategorisiere die Ergebnisse
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
   * Eine private Hilfsmethode, die eine Map von Präparat-IDs und deren Zählungen
   * in ein sortiertes Array von `PreparationStat`-Objekten umwandelt.
   * @param counts Eine Map, bei der der Schlüssel die Präparat-ID und der Wert die Anzahl ist.
   * @returns Ein nach Anzahl absteigend sortiertes Array von `PreparationStat`.
   */
  private getSortedPrepStats(counts: Map<string, number>): PreparationStat[] {
    return Array.from(counts.entries())
      .map(([prepId, count]) => {
        const prep = this.dataService.preparations().find(p => p.id === prepId);
        if (!prep) return null; // Falls ein Präparat gelöscht wurde, aber noch in alten Einträgen referenziert wird
        const man = this.dataService.manufacturers().find(m => m.id === prep.manufacturerId);
        const ai = this.dataService.activeIngredients().find(a => a.id === prep.activeIngredientId);
        return { prep, man, ai, count };
      })
      .filter((item): item is PreparationStat => item !== null) // Entfernt null-Werte
      .sort((a, b) => b.count - a.count); // Sortiert absteigend nach Anzahl
  }
}