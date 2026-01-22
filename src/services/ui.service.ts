import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DataService } from './data.service';
import { Mood, Effect, Manufacturer, Dosage, ActiveIngredient, Preparation, CrudEntity, EffectPerception } from '../models';
import { TranslationService } from './translation.service';

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
        
        this.formStack.update(stack => stack.slice(0, -1));
    }

    private handleCreate(type: CrudEntity) {
        switch (type) {
            case 'Mood': if (this.moodForm().description && this.moodForm().emoji) this.dataService.addItem(this.dataService.moods, this.moodForm() as Omit<Mood, 'id'>); break;
            case 'Effect': if (this.effectForm().description && this.effectForm().emoji) this.dataService.addItem(this.dataService.effects, this.effectForm() as Omit<Effect, 'id'>); break;
            case 'Manufacturer': if (this.manufacturerForm().name) this.dataService.addItem(this.dataService.manufacturers, this.manufacturerForm() as Omit<Manufacturer, 'id'>); break;
            case 'Dosage': if (this.dosageForm().amount && this.dosageForm().unit) this.dataService.addItem(this.dataService.dosages, this.dosageForm() as Omit<Dosage, 'id'>); break;
            case 'ActiveIngredient': if (this.activeIngredientForm().amount && this.activeIngredientForm().unit) this.dataService.addItem(this.dataService.activeIngredients, this.activeIngredientForm() as Omit<ActiveIngredient, 'id'>); break;
            case 'Preparation': if (this.preparationForm().name) this.dataService.addItem(this.dataService.preparations, this.preparationForm() as Omit<Preparation, 'id'>); break;
        }
    }
  
    private handleUpdate(type: CrudEntity, id: string) {
        switch (type) {
            case 'Mood': if (this.moodForm().description && this.moodForm().emoji) this.dataService.updateItem(this.dataService.moods, { ...this.moodForm(), id } as Mood); break;
            case 'Effect': if (this.effectForm().description && this.effectForm().emoji) this.dataService.updateItem(this.dataService.effects, { ...this.effectForm(), id } as Effect); break;
            case 'Manufacturer': if (this.manufacturerForm().name) this.dataService.updateItem(this.dataService.manufacturers, { ...this.manufacturerForm(), id } as Manufacturer); break;
            case 'Dosage': if (this.dosageForm().amount && this.dosageForm().unit) this.dataService.updateItem(this.dataService.dosages, { ...this.dosageForm(), id } as Dosage); break;
            case 'ActiveIngredient': if (this.activeIngredientForm().amount && this.activeIngredientForm().unit) this.dataService.updateItem(this.dataService.activeIngredients, { ...this.activeIngredientForm(), id } as ActiveIngredient); break;
            case 'Preparation': if (this.preparationForm().name) this.dataService.updateItem(this.dataService.preparations, { ...this.preparationForm(), id } as Preparation); break;
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
