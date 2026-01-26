import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, CrudEntity, EffectPerception, Page, Symptom, Activity } from '../models';
import { TranslationService, TranslationKey } from './translation.service';
import { ToastService } from './toast.service';
import { EMOJI_DATA } from '../emoji-data';

/**
 * Definiert den Zustand eines einzelnen Formulars im Stack.
 * Beinhaltet den Typ der Entität, optional das zu bearbeitende Element
 * und die aktuellen Werte des Formulars.
 */
export interface FormState {
  type: CrudEntity;
  item?: any; // Für den Bearbeitungsmodus
  formValues: Partial<any>;
  onSave?: (createdItem: any) => void;
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
    symptomForm = signal<Partial<Symptom>>({});
    activityForm = signal<Partial<Activity>>({});
    manufacturerForm = signal<Partial<Manufacturer>>({});
    dosageForm = signal<Partial<Dosage>>({});
    activeIngredientForm = signal<Partial<ActiveIngredient>>({});
    preparationForm = signal<Partial<Preparation>>({});
    customEmojiForm = signal<{ emoji?: string }>({});
    
    private allDefaultEmojis = computed(() => {
        return EMOJI_DATA.flatMap(category => category.emojis);
    });

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
                    case 'Symptom': this.symptomForm.set(form.formValues); break;
                    case 'Activity': this.activityForm.set(form.formValues); break;
                    case 'Manufacturer': this.manufacturerForm.set(form.formValues); break;
                    case 'Dosage': this.dosageForm.set(form.formValues); break;
                    case 'ActiveIngredient': this.activeIngredientForm.set(form.formValues); break;
                    case 'Preparation': this.preparationForm.set(form.formValues); break;
                    case 'CustomEmoji': this.customEmojiForm.set(form.formValues); break;
                }
            }
        }, { allowSignalWrites: true });
    }

    /**
     * Öffnet ein neues Hauptformular und ersetzt den aktuellen Stack.
     * @param type Der Typ der Entität, die erstellt werden soll.
     */
    openCreateForm(type: CrudEntity, onSave?: (createdItem: any) => void) {
        this.formStack.set([{ type, formValues: {}, onSave }]);
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

        if (form.item) { // Update mode
            const success = this.handleUpdate(form.type, form.item.id);
            if (success) {
                this.formStack.update(stack => stack.slice(0, -1));
            }
        } else { // Create mode
            const createdItem = this.handleCreate(form.type);
            if (createdItem) {
                form.onSave?.(createdItem);
        
                this.formStack.update(stack => {
                    if (stack.length > 1) {
                        const parentFormState = stack[stack.length - 2];
                        this.updateParentFormState(parentFormState, form.type, createdItem);
                    }
                    return stack.slice(0, -1);
                });
            }
        }
    }

    private updateParentFormState(parentState: FormState, createdType: CrudEntity, createdItem: any) {
        if (parentState.type === 'Preparation') {
            switch (createdType) {
                case 'Manufacturer':
                    parentState.formValues.manufacturerId = createdItem.id;
                    break;
                case 'ActiveIngredient':
                    parentState.formValues.activeIngredientId = createdItem.id;
                    break;
                case 'Dosage':
                    parentState.formValues.dosageId = createdItem.id;
                    break;
            }
        }
    }

    private showErrorToast(key: TranslationKey) {
        this.toastService.showError(this.translationService.t(key));
    }

    /**
     * Logik zum Erstellen einer neuen Entität. Enthält Validierung (z.B. auf Duplikate).
     * @param type Der Typ der zu erstellenden Entität.
     * @returns Die neu erstellte Entität bei Erfolg, ansonsten `null`.
     */
    private handleCreate(type: CrudEntity): any | null {
        switch (type) {
            case 'Mood': {
                const formValues = this.moodForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return null;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return null;
                }
                if (this.dataService.moods().some(m => m.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateMoodError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.moods, { ...formValues, description } as Omit<Mood, 'id'>);
            }
             case 'Symptom': {
                const formValues = this.symptomForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return null;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return null;
                }
                if (this.dataService.symptoms().some(s => s.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateSymptomError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.symptoms, { ...formValues, description } as Omit<Symptom, 'id'>);
            }
            case 'Activity': {
                const formValues = this.activityForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return null;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return null;
                }
                if (this.dataService.activities().some(a => a.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateActivityError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.activities, { ...formValues, description } as Omit<Activity, 'id'>);
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return null;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return null;
                }
                if (this.dataService.effects().some(e => e.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateEffectError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.effects, { ...formValues, description } as Omit<Effect, 'id'>);
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                const name = formValues.name?.trim();
                if (!name) {
                    this.showErrorToast('formErrorNameRequired');
                    return null;
                }
                if (this.dataService.manufacturers().some(m => m.name.toLowerCase() === name.toLowerCase())) {
                    this.showErrorToast('duplicateManufacturerError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.manufacturers, { ...formValues, name } as Omit<Manufacturer, 'id'>);
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (formValues.amount == null) {
                    this.showErrorToast('formErrorDosageAmountRequired');
                    return null;
                }
                const unit = formValues.unit?.trim();
                if (!unit) {
                    this.showErrorToast('formErrorDosageUnitRequired');
                    return null;
                }
                if (this.dataService.dosages().some(d => d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateDosageError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.dosages, { ...formValues, unit } as Omit<Dosage, 'id'>);
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                const amount = formValues.amount?.trim();
                if (!amount) {
                    this.showErrorToast('formErrorActiveIngredientAmountRequired');
                    return null;
                }
                const unit = formValues.unit?.trim();
                if (!unit) {
                    this.showErrorToast('formErrorActiveIngredientUnitRequired');
                    return null;
                }
                if (this.dataService.activeIngredients().some(ai => ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateActiveIngredientError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.activeIngredients, { ...formValues, amount, unit } as Omit<ActiveIngredient, 'id'>);
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                const name = formValues.name?.trim();
                if (!name) {
                    this.showErrorToast('formErrorNameRequired');
                    return null;
                }
                if (this.dataService.preparations().some(p => p.name.toLowerCase() === name.toLowerCase() && p.manufacturerId === formValues.manufacturerId && p.activeIngredientId === formValues.activeIngredientId)) {
                    this.showErrorToast('duplicatePreparationError');
                    return null;
                }
                return this.dataService.addItem(this.dataService.preparations, { ...formValues, name } as Omit<Preparation, 'id'>);
            }
            case 'CustomEmoji': {
                const formValues = this.customEmojiForm();
                const emoji = formValues.emoji?.trim();
                if (!emoji) {
                    this.showErrorToast('formErrorCustomEmojiRequired');
                    return null;
                }

                // Validiert, dass es sich um ein einzelnes sichtbares Zeichen/Emoji handelt
                if ([...emoji].length !== 1) {
                    this.showErrorToast('invalidEmojiError');
                    return null;
                }

                // Prüft auf Duplikate in Standard- und benutzerdefinierten Emojis
                const allEmojis = new Set([...this.allDefaultEmojis(), ...this.dataService.customEmojis()]);
                if (allEmojis.has(emoji)) {
                    this.showErrorToast('duplicateCustomEmojiError');
                    return null;
                }

                this.dataService.customEmojis.update(emojis => [...emojis, emoji]);
                return emoji;
            }
        }
        return null;
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
                 if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return false;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return false;
                }
                if (this.dataService.moods().some(m => m.id !== id && m.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateMoodError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.moods, { ...formValues, id, description } as Mood);
                break;
            }
            case 'Symptom': {
                const formValues = this.symptomForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return false;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return false;
                }
                if (this.dataService.symptoms().some(s => s.id !== id && s.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateSymptomError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.symptoms, { ...formValues, id, description } as Symptom);
                break;
            }
            case 'Activity': {
                const formValues = this.activityForm();
                 if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return false;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return false;
                }
                if (this.dataService.activities().some(a => a.id !== id && a.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateActivityError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.activities, { ...formValues, id, description } as Activity);
                break;
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.emoji) {
                    this.showErrorToast('formErrorEmojiRequired');
                    return false;
                }
                const description = formValues.description?.trim();
                if (!description) {
                    this.showErrorToast('formErrorDescriptionRequired');
                    return false;
                }
                if (this.dataService.effects().some(e => e.id !== id && e.description.toLowerCase() === description.toLowerCase())) {
                    this.showErrorToast('duplicateEffectError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.effects, { ...formValues, id, description } as Effect);
                break;
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                const name = formValues.name?.trim();
                if (!name) {
                    this.showErrorToast('formErrorNameRequired');
                    return false;
                }
                if (this.dataService.manufacturers().some(m => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) {
                    this.showErrorToast('duplicateManufacturerError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.manufacturers, { ...formValues, id, name } as Manufacturer);
                break;
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (formValues.amount == null) {
                    this.showErrorToast('formErrorDosageAmountRequired');
                    return false;
                }
                const unit = formValues.unit?.trim();
                if (!unit) {
                    this.showErrorToast('formErrorDosageUnitRequired');
                    return false;
                }
                if (this.dataService.dosages().some(d => d.id !== id && d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateDosageError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.dosages, { ...formValues, id, unit } as Dosage);
                break;
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                const amount = formValues.amount?.trim();
                if (!amount) {
                    this.showErrorToast('formErrorActiveIngredientAmountRequired');
                    return false;
                }
                const unit = formValues.unit?.trim();
                if (!unit) {
                    this.showErrorToast('formErrorActiveIngredientUnitRequired');
                    return false;
                }
                if (this.dataService.activeIngredients().some(ai => ai.id !== id && ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    this.showErrorToast('duplicateActiveIngredientError');
                    return false;
                }
                this.dataService.updateItem(this.dataService.activeIngredients, { ...formValues, id, amount, unit } as ActiveIngredient);
                break;
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                const name = formValues.name?.trim();
                if (!name) {
                    this.showErrorToast('formErrorNameRequired');
                    return false;
                }
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
        this.symptomForm.set({});
        this.activityForm.set({});
        this.manufacturerForm.set({});
        this.dosageForm.set({});
        this.activeIngredientForm.set({});
        this.preparationForm.set({});
        this.customEmojiForm.set({});
    }
}