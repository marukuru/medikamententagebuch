import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, CrudEntity, EffectPerception, Page } from '../models';
import { TranslationService, TranslationKey } from './translation.service';
import { ToastService } from './toast.service';

/**
 * Definiert den Zustand eines einzelnen Formulars im Stack.
 * Beinhaltet den Typ der Entität, optional das zu bearbeitende Element
 * und die aktuellen Werte des Formulars.
 */
export interface FormState {
  type: CrudEntity;
  item?: any; // Für den Bearbeitungsmodus
  formValues: Partial<any>;
}

/**
 * Der UiService verwaltet den Zustand der Benutzeroberfläche, der nicht direkt
 * mit den Kerndaten zusammenhängt. Hauptsächlich ist dies die Verwaltung von
 * modalen Formularen, insbesondere der generischen CRUD-Formulare in den Einstellungen.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
    dataService = inject(DataService);
    translationService = inject(TranslationService);
    toastService = inject(ToastService);

    /**
     * Ein Stack, der die Kette von geöffneten Formularen verwaltet.
     * Dies ermöglicht das Öffnen eines "Unterformulars" (z.B. "Hersteller anlegen"
     * aus dem "Präparat anlegen"-Formular) und die Rückkehr zum vorherigen Zustand.
     */
    formStack = signal<FormState[]>([]);
    
    /**
     * Signal, um das Öffnen des Tagebuchformulars von außen anzufordern (z.B. per Benachrichtigung).
     */
    requestDiaryFormOpen = signal(false);

    /**
     * Signal, um eine Navigation zu einer bestimmten Seite anzufordern.
     */
    navigateToPage = signal<Page | null>(null);

    /**
     * Ein Computed Signal, das immer das oberste (aktive) Formular aus dem Stack zurückgibt.
     */
    currentForm = computed(() => {
        const stack = this.formStack();
        return stack[stack.length - 1];
    });
    
    // --- Signale für die einzelnen Formular-Modelle ---
    // Jedes Formular hat sein eigenes Signal, um die Daten zu halten.
    // Dies ist an `[(ngModel)]` im Template gebunden.
    moodForm = signal<Partial<Mood>>({});
    effectForm = signal<Partial<Effect>>({});
    manufacturerForm = signal<Partial<Manufacturer>>({});
    dosageForm = signal<Partial<Dosage>>({});
    activeIngredientForm = signal<Partial<ActiveIngredient>>({});
    preparationForm = signal<Partial<Preparation>>({});
    
    perceptionOptions = computed(() => {
        const t = this.translationService.translations();
        return [
            { label: t.formPerceptionPositive, value: 'positive' as EffectPerception },
            { label: t.formPerceptionNegative, value: 'negative' as EffectPerception },
            { label: t.formPerceptionNeutral, value: 'neutral' as EffectPerception },
        ];
    });

    constructor() {
        // Dieser `effect` reagiert auf Änderungen im `currentForm` Signal.
        // Er sorgt dafür, dass das korrekte Formular-Signal (z.B. `moodForm`)
        // mit den Werten des aktuellen Formulars aus dem Stack befüllt wird.
        effect(() => {
            const form = this.currentForm();
            this.resetForms(); // Zuerst alle Formulare zurücksetzen
            if(form) {
                switch(form.type) {
                    case 'Mood': this.moodForm.set(form.formValues); break;
                    case 'Effect': this.effectForm.set(form.formValues); break;
                    case 'Manufacturer': this.manufacturerForm.set(form.formValues); break;
                    case 'Dosage': this.dosageForm.set(form.formValues); break;
                    case 'ActiveIngredient': this.activeIngredientForm.set(form.formValues); break;
                    case 'Preparation': this.preparationForm.set(form.formValues); break;
                }
            }
        }, { allowSignalWrites: true });
    }

    /**
     * Öffnet ein neues Hauptformular und ersetzt den aktuellen Stack.
     * @param type Der Typ der Entität, die erstellt werden soll.
     */
    openCreateForm(type: CrudEntity) {
        this.formStack.set([{ type, formValues: {} }]);
    }

    /**
     * Öffnet ein Hauptformular im Bearbeitungsmodus.
     * @param type Der Typ der Entität.
     * @param item Das zu bearbeitende Objekt.
     */
    openEditForm(type: CrudEntity, item: any) {
        this.formStack.set([{ type, item: { ...item }, formValues: { ...item } }]);
    }
    
    /**
     * Öffnet ein Unterformular (z.B. Hersteller erstellen aus dem Präparat-Formular).
     * Speichert den Zustand des aktuellen Formulars und legt ein neues Formular oben auf den Stack.
     * @param subFormType Der Typ des zu öffnenden Unterformulars.
     */
    openSubCreateForm(subFormType: CrudEntity) {
        this.formStack.update(stack => {
            const currentFormState = stack[stack.length - 1]!;
            // Aktuelle (möglicherweise geänderte) Werte aus dem Formular-Signal sichern
            let currentFormValues;
            switch(currentFormState.type) {
                case 'Preparation': currentFormValues = this.preparationForm(); break;
                default: currentFormValues = {};
            }
            
            const newStack = stack.slice(0, -1); // Letztes Element entfernen
            newStack.push({ ...currentFormState, formValues: currentFormValues }); // Aktualisiertes Element wieder hinzufügen
            newStack.push({ type: subFormType, formValues: {} }); // Neues Unterformular hinzufügen
            return newStack;
        });
    }

    /**
     * Schließt das oberste Formular, indem es vom Stack entfernt wird.
     */
    cancelForm() {
        this.formStack.update(stack => stack.slice(0, -1));
    }

    /**
     * Speichert das aktuelle Formular. Ruft entweder `handleUpdate` oder `handleCreate` auf.
     * Bei Erfolg wird das Formular vom Stack entfernt.
     */
    saveForm() {
        const form = this.currentForm();
        if (!form) return;

        let success = false;
        if (form.item) {
          success = this.handleUpdate(form.type, form.item.id);
        } else {
          success = this.handleCreate(form.type);
        }
        
        if (success) {
            this.formStack.update(stack => stack.slice(0, -1));
        }
    }

    private showErrorToast(key: TranslationKey) {
        this.toastService.showError(this.translationService.t(key));
    }

    /**
     * Logik zum Erstellen einer neuen Entität. Enthält Validierung (z.B. auf Duplikate).
     * @param type Der Typ der zu erstellenden Entität.
     * @returns `true` bei Erfolg, `false` bei Validierungsfehlern.
     */
    private handleCreate(type: CrudEntity): boolean {
        switch (type) {
            case 'Mood': {
                const formValues = this.moodForm();
                if (!formValues.description || !formValues.emoji) return false;
                const description = formValues.description.trim();
                if (!description) return false;
                if (this.dataService.moods().some(m => m.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateMoodError');
                    return false;
                }
                this.dataService.addItem(this.dataService.moods, { ...formValues, description } as Omit<Mood, 'id'>);
                break;
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.description || !formValues.emoji) return false;
                const description = formValues.description.trim();
                if (!description) return false;
                if (this.dataService.effects().some(e => e.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateEffectError');
                    return false;
                }
                this.dataService.addItem(this.dataService.effects, { ...formValues, description } as Omit<Effect, 'id'>);
                break;
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                if (!formValues.name) return false;
                const name = formValues.name.trim();
                if (!name) return false;
                if (this.dataService.manufacturers().some(m => m.name.toLowerCase() === name.toLowerCase())) {
                    this.showErrorToast('duplicateManufacturerError');
                    return false;
                }
                this.dataService.addItem(this.dataService.manufacturers, { ...formValues, name } as Omit<Manufacturer, 'id'>);
                break;
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (!formValues.amount || !formValues.unit) return false;
                const unit = formValues.unit.trim();
                if (!unit) return false;
                if (this.dataService.dosages().some(d => d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateDosageError');
                    return false;
                }
                this.dataService.addItem(this.dataService.dosages, { ...formValues, unit } as Omit<Dosage, 'id'>);
                break;
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                if (!formValues.amount || !formValues.unit) return false;
                const amount = formValues.amount.trim();
                const unit = formValues.unit.trim();
                if (!amount || !unit) return false;
                if (this.dataService.activeIngredients().some(ai => ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateActiveIngredientError');
                    return false;
                }
                this.dataService.addItem(this.dataService.activeIngredients, { ...formValues, amount, unit } as Omit<ActiveIngredient, 'id'>);
                break;
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                if (!formValues.name) return false;
                const name = formValues.name.trim();
                if (!name) return false;
                if (this.dataService.preparations().some(p => p.name.toLowerCase() === name.toLowerCase() && p.manufacturerId === formValues.manufacturerId && p.activeIngredientId === formValues.activeIngredientId)) {
                    this.showErrorToast('duplicatePreparationError');
                    return false;
                }
                this.dataService.addItem(this.dataService.preparations, { ...formValues, name } as Omit<Preparation, 'id'>);
                break;
            }
        }
        return true;
    }
  
    /**
     * Logik zum Aktualisieren einer bestehenden Entität.
     * @param type Der Typ der zu aktualisierenden Entität.
     * @param id Die ID des zu aktualisierenden Objekts.
     * @returns `true` bei Erfolg, `false` bei Validierungsfehlern.
     */
    private handleUpdate(type: CrudEntity, id: string): boolean {
        switch (type) {
            case 'Mood': {
                const formValues = this.moodForm();
                if (!formValues.description || !formValues.emoji) return false;
                const description = formValues.description.trim();
                if (!description) return false;
                if (this.dataService.moods().some(m => m.id !== id && m.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateMoodError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.moods, { ...formValues, id, description } as Mood);
                break;
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.description || !formValues.emoji) return false;
                const description = formValues.description.trim();
                if (!description) return false;
                if (this.dataService.effects().some(e => e.id !== id && e.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateEffectError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.effects, { ...formValues, id, description } as Effect);
                break;
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                if (!formValues.name) return false;
                const name = formValues.name.trim();
                if (!name) return false;
                if (this.dataService.manufacturers().some(m => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) {
                    this.showErrorToast('duplicateManufacturerError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.manufacturers, { ...formValues, id, name } as Manufacturer);
                break;
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (!formValues.amount || !formValues.unit) return false;
                const unit = formValues.unit.trim();
                if (!unit) return false;
                if (this.dataService.dosages().some(d => d.id !== id && d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateDosageError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.dosages, { ...formValues, id, unit } as Dosage);
                break;
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                if (!formValues.amount || !formValues.unit) return false;
                const amount = formValues.amount.trim();
                const unit = formValues.unit.trim();
                if (!amount || !unit) return false;
                if (this.dataService.activeIngredients().some(ai => ai.id !== id && ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateActiveIngredientError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.activeIngredients, { ...formValues, id, amount, unit } as ActiveIngredient);
                break;
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                if (!formValues.name) return false;
                const name = formValues.name.trim();
                if (!name) return false;
                if (this.dataService.preparations().some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase() && p.manufacturerId === formValues.manufacturerId && p.activeIngredientId === formValues.activeIngredientId)) {
                    this.showErrorToast('duplicatePreparationError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.preparations, { ...formValues, id, name } as Preparation);
                break;
            }
        }
        return true;
    }

    /**
     * Setzt alle Formular-Signale auf leere Objekte zurück.
     */
    private resetForms() {
        this.moodForm.set({});
        this.effectForm.set({});
        this.manufacturerForm.set({});
        this.dosageForm.set({});
        this.activeIngredientForm.set({});
        this.preparationForm.set({});
    }
}