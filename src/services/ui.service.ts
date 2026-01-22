import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, CrudEntity, EffectPerception } from '../models';
import { TranslationService, TranslationKey } from './translation.service';

export interface FormState {
  type: CrudEntity;
  item?: any; // For editing
  formValues: Partial<any>;
}

@Injectable({ providedIn: 'root' })
export class UiService {
    dataService = inject(DataService);
    translationService = inject(TranslationService);

    formStack = signal<FormState[]>([]);
    currentForm = computed(() => {
        const stack = this.formStack();
        return stack[stack.length - 1];
    });
    
    // Form Models
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
        effect(() => {
            const form = this.currentForm();
            this.resetForms();
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

    openCreateForm(type: CrudEntity) {
        this.formStack.set([{ type, formValues: {} }]);
    }

    openEditForm(type: CrudEntity, item: any) {
        this.formStack.set([{ type, item: { ...item }, formValues: { ...item } }]);
    }
    
    openSubCreateForm(subFormType: CrudEntity) {
        this.formStack.update(stack => {
            const currentFormState = stack[stack.length - 1]!;
            let currentFormValues;
            switch(currentFormState.type) {
                case 'Preparation': currentFormValues = this.preparationForm(); break;
                default: currentFormValues = {};
            }
            
            const newStack = stack.slice(0, -1);
            newStack.push({ ...currentFormState, formValues: currentFormValues });
            newStack.push({ type: subFormType, formValues: {} });
            return newStack;
        });
    }

    cancelForm() {
        this.formStack.update(stack => stack.slice(0, -1));
    }

    saveForm() {
        const form = this.currentForm();
        if (!form) return;

        if (form.item) {
          this.handleUpdate(form.type, form.item.id);
        } else {
          this.handleCreate(form.type);
        }
        
        // Only close form if save was successful
        const newForm = this.currentForm();
        if (form === newForm) { // if form hasn't changed (due to error), don't pop stack
            this.formStack.update(stack => stack.slice(0, -1));
        }
    }

    private showAlert(key: TranslationKey) {
        alert(this.translationService.t(key));
    }

    private handleCreate(type: CrudEntity) {
        switch (type) {
            case 'Mood': {
                const formValues = this.moodForm();
                if (!formValues.description || !formValues.emoji) return;
                const description = formValues.description.trim();
                if (!description) return;
                if (this.dataService.moods().some(m => m.description.toLowerCase() === description.toLowerCase())) {
                    return this.showAlert('duplicateMoodError');
                }
                this.dataService.addItem(this.dataService.moods, { ...formValues, description } as Omit<Mood, 'id'>);
                break;
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.description || !formValues.emoji) return;
                const description = formValues.description.trim();
                if (!description) return;
                if (this.dataService.effects().some(e => e.description.toLowerCase() === description.toLowerCase())) {
                    return this.showAlert('duplicateEffectError');
                }
                this.dataService.addItem(this.dataService.effects, { ...formValues, description } as Omit<Effect, 'id'>);
                break;
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                if (!formValues.name) return;
                const name = formValues.name.trim();
                if (!name) return;
                if (this.dataService.manufacturers().some(m => m.name.toLowerCase() === name.toLowerCase())) {
                    return this.showAlert('duplicateManufacturerError');
                }
                this.dataService.addItem(this.dataService.manufacturers, { ...formValues, name } as Omit<Manufacturer, 'id'>);
                break;
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (!formValues.amount || !formValues.unit) return;
                const unit = formValues.unit.trim();
                if (!unit) return;
                if (this.dataService.dosages().some(d => d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    return this.showAlert('duplicateDosageError');
                }
                this.dataService.addItem(this.dataService.dosages, { ...formValues, unit } as Omit<Dosage, 'id'>);
                break;
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                if (!formValues.amount || !formValues.unit) return;
                const amount = formValues.amount.trim();
                const unit = formValues.unit.trim();
                if (!amount || !unit) return;
                if (this.dataService.activeIngredients().some(ai => ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    return this.showAlert('duplicateActiveIngredientError');
                }
                this.dataService.addItem(this.dataService.activeIngredients, { ...formValues, amount, unit } as Omit<ActiveIngredient, 'id'>);
                break;
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                if (!formValues.name) return;
                const name = formValues.name.trim();
                if (!name) return;
                if (this.dataService.preparations().some(p => p.name.toLowerCase() === name.toLowerCase() && p.manufacturerId === formValues.manufacturerId && p.activeIngredientId === formValues.activeIngredientId)) {
                    return this.showAlert('duplicatePreparationError');
                }
                this.dataService.addItem(this.dataService.preparations, { ...formValues, name } as Omit<Preparation, 'id'>);
                break;
            }
        }
    }
  
    private handleUpdate(type: CrudEntity, id: string) {
        switch (type) {
            case 'Mood': {
                const formValues = this.moodForm();
                if (!formValues.description || !formValues.emoji) return;
                const description = formValues.description.trim();
                if (!description) return;
                if (this.dataService.moods().some(m => m.id !== id && m.description.toLowerCase() === description.toLowerCase())) {
                    return this.showAlert('duplicateMoodError');
                }
                this.dataService.updateItem(this.dataService.moods, { ...formValues, id, description } as Mood);
                break;
            }
            case 'Effect': {
                const formValues = this.effectForm();
                if (!formValues.description || !formValues.emoji) return;
                const description = formValues.description.trim();
                if (!description) return;
                if (this.dataService.effects().some(e => e.id !== id && e.description.toLowerCase() === description.toLowerCase())) {
                    return this.showAlert('duplicateEffectError');
                }
                this.dataService.updateItem(this.dataService.effects, { ...formValues, id, description } as Effect);
                break;
            }
            case 'Manufacturer': {
                const formValues = this.manufacturerForm();
                if (!formValues.name) return;
                const name = formValues.name.trim();
                if (!name) return;
                if (this.dataService.manufacturers().some(m => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) {
                    return this.showAlert('duplicateManufacturerError');
                }
                this.dataService.updateItem(this.dataService.manufacturers, { ...formValues, id, name } as Manufacturer);
                break;
            }
            case 'Dosage': {
                const formValues = this.dosageForm();
                if (!formValues.amount || !formValues.unit) return;
                const unit = formValues.unit.trim();
                if (!unit) return;
                if (this.dataService.dosages().some(d => d.id !== id && d.amount === formValues.amount && d.unit.toLowerCase() === unit.toLowerCase())) {
                    return this.showAlert('duplicateDosageError');
                }
                this.dataService.updateItem(this.dataService.dosages, { ...formValues, id, unit } as Dosage);
                break;
            }
            case 'ActiveIngredient': {
                const formValues = this.activeIngredientForm();
                if (!formValues.amount || !formValues.unit) return;
                const amount = formValues.amount.trim();
                const unit = formValues.unit.trim();
                if (!amount || !unit) return;
                if (this.dataService.activeIngredients().some(ai => ai.id !== id && ai.amount.toLowerCase() === amount.toLowerCase() && ai.unit.toLowerCase() === unit.toLowerCase())) {
                    return this.showAlert('duplicateActiveIngredientError');
                }
                this.dataService.updateItem(this.dataService.activeIngredients, { ...formValues, id, amount, unit } as ActiveIngredient);
                break;
            }
            case 'Preparation': {
                const formValues = this.preparationForm();
                if (!formValues.name) return;
                const name = formValues.name.trim();
                if (!name) return;
                if (this.dataService.preparations().some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase() && p.manufacturerId === formValues.manufacturerId && p.activeIngredientId === formValues.activeIngredientId)) {
                    return this.showAlert('duplicatePreparationError');
                }
                this.dataService.updateItem(this.dataService.preparations, { ...formValues, id, name } as Preparation);
                break;
            }
        }
    }

    private resetForms() {
        this.moodForm.set({});
        this.effectForm.set({});
        this.manufacturerForm.set({});
        this.dosageForm.set({});
        this.activeIngredientForm.set({});
        this.preparationForm.set({});
    }
}