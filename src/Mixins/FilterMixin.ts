import type {DataproviderCore} from "../DataproviderCore";
import {Filter} from "../Data/Filter";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import {DatalistFilterError} from "../Exceptions/DatalistFilterError";
import type {Constructor} from "./types";

export function FilterMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithFilters extends Base {
        protected filterSetup(): void {
            //checkboxes
            const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                checkbox.addEventListener('change', this.load.bind(this, true, false))
            }

            //inputs
            const inputs = document.querySelectorAll('input.'+this.dataproviderID+'-filter-input:not([type="checkbox"])') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                input.addEventListener('blur', this.load.bind(this, true, false))
            }

            // setup form
            const filterFormId = this.dataprovider.getAttribute('data-filter-form-id') ?? this.dataproviderID + '-filter-form'
            this.filterForm = document.querySelector('#'+filterFormId);
            if (this.filterForm === null) {
                return;
            }

            // setup display list
            const filterlistId = this.dataprovider.getAttribute('data-filter-list-id') ?? this.dataproviderID + '-filter-list'
            this.filterlist = document.querySelector('#'+filterlistId);

            // setup filter select
            this.filterSelect = this.filterForm.querySelector('[name="filter"]');
            if (this.filterSelect === null) {
                throw new DatalistConstructionError('Filter selector with name "filter" is missing on filter form #'+filterFormId, this.errorCallback);
            }

            // operator filter select
            this.operatorSelect = this.filterForm.querySelector('[name="operator"]');
            if (this.operatorSelect === null) {
                throw new DatalistConstructionError('Operator selector with name "operator" is missing on filter form #'+filterFormId, this.errorCallback);
            }

            // filter confirm button
            this.addFilterButton = document.querySelector('button#'+this.dataproviderID+'-filter-confirm-button');
            if (this.addFilterButton === null) {
                throw new DatalistConstructionError('Button with id "'+this.dataproviderID+'-filter-confirm-button" is missing #'+filterFormId, this.errorCallback);
            }

            this.addFilterButton.addEventListener('click', this.addFilterEvent.bind(this));
        }

        protected async filterInit(): Promise<void> {
            if (this.filterSelect !== null) {
                const data = await this.fetchData(this.url + '/filters');

                const filterOption = document.createElement('option')
                filterOption.textContent = 'Select a filter'
                filterOption.value = 'placeholder-filter';
                filterOption.classList.add('placeholder-filter')
                this.filterSelect.append(filterOption);

                for (const filter of data) {
                    const filterOption = document.createElement('option')
                    filterOption.textContent = this.formatString(filter);
                    filterOption.value = filter;
                    this.filterSelect.append(filterOption);
                }

                this.filterSelect.addEventListener('change', this.onFilterSelectEvent.bind(this));
            }

            this.resetFilterSelects();
        }

        protected addFilter(displayString:string, filter:string, operator:string, value:string|null = null, init: boolean = false): boolean {
            displayString = this.formatString(displayString);

            for (const currFilter of this.filters) {
                if (currFilter.filter === filter && currFilter.operator === operator) {
                    throw new Error('Duplicate filter error');
                }
            }

            const filterItem = new Filter('form', filter, operator, value, displayString);
            this.filters.push(filterItem);
            this.addFilterDisplay(filterItem)

            if (this.filterAddedEvent !== null && !init) {
                this.filterAddedEvent(this, filterItem);
            }

            this.load(true, false);

            return true;
        }

        protected getFilters(): Array<Filter>{
            for (let i = 0; i < this.filters.length; i++) {
                const storedFilter = this.filters[i];
                if (storedFilter.type === 'checkbox' || storedFilter.type === 'input' || storedFilter.type === 'dataselect') {
                    this.filters.splice(i, 1)
                    i--;
                }
            }

            const filters: Array<Filter> = this.filters;

            // Checkbox filters
            const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                let operator;
                let value;

                if (checkbox.checked) {
                    operator = checkbox.getAttribute('data-checked-operator') ?? undefined;
                    value = checkbox.getAttribute('data-checked-value') ?? undefined;
                } else {
                    operator = checkbox.getAttribute('data-unchecked-operator') ?? undefined;
                    value = checkbox.getAttribute('data-unchecked-value') ?? undefined;
                }

                if (operator !== undefined && operator !== null) {
                    const filter = new Filter('checkbox', checkbox.name, operator, value);
                    filters.push(filter);
                }
            }

            // Input filters
            const inputs = document.querySelectorAll('input.'+this.dataproviderID+'-filter-input:not([type="checkbox"])') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                let value: string|null = input.value;
                let operator;

                if (value !== null && value !== "") {
                    operator = input.getAttribute('data-filled-operator') ?? undefined;
                } else {
                    operator = input.getAttribute('data-empty-operator') ?? undefined;
                    value = input.getAttribute('data-empty-value') ?? null;
                }

                if (operator !== undefined && operator !== null) {
                    const filter = new Filter('input', input.name, operator, value);
                    filters.push(filter);
                }
            }

            return filters;
        }

        protected normalizeFilterCheckboxes(data:{[key:string]: any}) {
            let filters = data.filters;
            if (filters === undefined) {
                filters = [];
            }

            const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox')
            for (let i = 0; i < checkboxes.length ; i++) {
                const checkbox = checkboxes[i] as HTMLInputElement;
                if (checkbox.checked === false) {
                    continue;
                }

                let filter = null;
                for (const filterElement of filters) {
                    if (filterElement.filter === checkbox.name) {
                        filter = filterElement;
                    }
                }

                if (filter === null) {
                    if (checkbox.getAttribute('data-checked-operator') !== null && checkbox.getAttribute('data-checked-value') !== null) {
                        checkbox.checked = false;
                    }

                    continue;
                }

                if (
                    (checkbox.getAttribute('data-checked-operator') === null || checkbox.getAttribute('data-checked-value') === null) &&
                    checkbox.getAttribute('data-unchecked-operator') === filter.operator &&
                    checkbox.getAttribute('data-unchecked-value') === filter.value
                ) {
                    checkbox.checked = false;
                    continue;
                }

                if (
                    checkbox.getAttribute('data-checked-operator') !== filter.operator ||
                    checkbox.getAttribute('data-checked-value') !== filter.value
                ) {
                    checkbox.checked = false;
                }
            }
        }

        protected resetFilterSelects() {
            if (this.filterSelect === null) {
                return;
            }

            this.filterSelect.style.order = '1';

            if (this.operatorSelect !== null) {
                this.operatorSelect.classList.add('hidden');
                this.operatorSelect.style.order = '2'
            }

            const valueSelects = this.filterForm?.querySelectorAll('.filter-value-select') as NodeListOf<HTMLElement>;
            for (const valueSelect of valueSelects) {
                valueSelect.classList.add('hidden');
                valueSelect.style.order = '3'
            }
        }

        protected addFilterDisplay(filter:Filter) {
            const filterItem = this.createFilterDisplay(filter);
            this.filterlist?.append(filterItem);

            for (let i = 0; i < this.filters.length; i++) {
                const filterData = this.filters[i] as Filter;
                if (
                    filterData.filter === filter.filter &&
                    filterData.operator === filter.operator &&
                    filterData.value === filter.value
                ) {
                    filterData.displayElement = filterItem;
                    this.filters[i] = filterData;
                }
            }
        }

        protected createFilterDisplay(filter:Filter): HTMLElement {
            const container = document.createElement('div');
            container.classList.value = this.dataprovider.getAttribute('data-filter-item-container-cls') ?? '';
            container.classList.add('filter-item')

            const filterDisplay = document.createElement('span');
            filterDisplay.classList.value = this.dataprovider.getAttribute('data-filter-text-cls') ?? '';
            filterDisplay.textContent = filter.display;
            container.append(filterDisplay);

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = this.dataprovider.getAttribute('data-filter-delete-button-content') ?? 'X';
            deleteButton.classList.value = this.dataprovider.getAttribute('data-filter-delete-button-cls') ?? '';
            deleteButton.addEventListener('click', this.removeFilterEvent.bind(this, container));
            container.append(deleteButton);

            return container;
        }

        protected async onFilterSelectEvent() {
            this.resetFilterSelects();

            const filter = this.filterSelect!.value;
            const data = await this.fetchData(this.url + '/filters?filter='+filter);

            // set operators
            this.operatorSelect!.innerHTML = '';
            this.operatorSelect?.classList.remove('hidden');

            for (const operator of data['operators']) {
                const operatorOption = document.createElement('option');
                operatorOption.value = operator['operator'];
                operatorOption.textContent = operator['text'];
                this.operatorSelect!.append(operatorOption);
            }

            await this.performOnfilterSelect(data)

            this.filterForm?.setAttribute('data-filter-type', data['type']);
        }

        protected async performOnfilterSelect(data:{[key:string]:any}) {
            switch (data['type']) {
                case 'select':
                    const select = this.filterForm?.querySelector('select[name="select"].filter-value-select') as HTMLSelectElement|null;
                    if (select === null) {
                        throw new DatalistConstructionError('Value select with name `select` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    select.classList.remove('hidden');
                    select.innerHTML = '';

                    for (const selectData of data['options']) {
                        const option = document.createElement('option');
                        option.value = selectData;
                        option.textContent = selectData;
                        select.append(option);
                    }

                    break;
                case 'bool':
                    this.operatorSelect!.style.order = '0';

                    break;
                case 'number':
                    const numberInput = this.filterForm?.querySelector('input[name="number"][type="number"].filter-value-select') as HTMLInputElement|null;
                    if (numberInput === null) {
                        throw new DatalistConstructionError('Value number input with name `number` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    numberInput.value = (parseInt(data['options']['min']) < 0) ?  '0' : data['options']['min'];
                    numberInput.max = data['options']['max'];
                    numberInput.min = data['options']['min'];
                    numberInput.classList.remove('hidden');
                    break;
                case 'date':
                    const dateInput = this.filterForm?.querySelector('input[name="date"][type="date"].filter-value-select') as HTMLInputElement|null;
                    if (dateInput === null) {
                        throw new DatalistConstructionError('Value date input with name `date` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    dateInput.value = '0';
                    dateInput.max = data['options']['max'];
                    dateInput.min = data['options']['min'];
                    dateInput.classList.remove('hidden');
                    break;
            }
        }

        protected async addFilterEvent() {
            const filter = this.filterSelect?.value ?? null;
            if (filter === null) {
                throw new DatalistFilterError('No filter is selected on the filter form from dataprovider #'+this.dataproviderID, this.errorCallback);
            }

            const operator = this.operatorSelect?.value ?? null;
            if (operator === null) {
                throw new DatalistFilterError('No operator is selected on the filter form from dataprovider #'+this.dataproviderID, this.errorCallback);
            }

            const type = this.filterForm?.getAttribute('data-filter-type') ?? '';
            await this.performAddFilterEvent(filter, type, operator)
        }

        protected async performAddFilterEvent(filter:string, type:string, operator:string) {
            let value = null;
            let displayString = '';

            switch (type) {
                case 'bool':
                    value = (operator === '=') ? '1' : '0'
                    displayString = this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + filter;
                    this.addFilter(displayString, filter, operator, value)
                    break;
                case 'select':
                    const select = this.filterForm?.querySelector('select[name="select"].filter-value-select') as HTMLSelectElement|null;
                    if (select === null) {
                        throw new DatalistConstructionError('Value select with name `select` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    value = select.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
                case 'number':
                    const numberInput = this.filterForm?.querySelector('input[name="number"][type="number"].filter-value-select') as HTMLInputElement|null;
                    if (numberInput === null) {
                        throw new DatalistConstructionError('Value number input with name `number` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    value = numberInput.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
                case 'date':
                    const dateInput = this.filterForm?.querySelector('input[name="date"][type="date"].filter-value-select') as HTMLInputElement|null;
                    if (dateInput === null) {
                        throw new DatalistConstructionError('Value date input with name `date` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                    }

                    value = dateInput.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
            }
        }

        protected async removeFilterEvent(filterElement: HTMLElement) {
            for (let i = 0; i < this.filters.length; i++) {
                const filterData = this.filters[i] as Filter;
                if (filterData.displayElement === filterElement) {
                    this.filters.splice(i, 1);
                    filterElement.remove();
                    await this.load(true, false);
                    return;
                }
            }
        }

        public addManualFilter(filter:string, operator:string, value:string|null = null, init: boolean = false): boolean {
            const filterItem = new Filter('manual', filter, operator, value);
            this.filters.push(filterItem);
            this.addFilterDisplay(filterItem)

            if (init === false) {
                if (this.filterAddedEvent !== null) {
                    this.filterAddedEvent(this, filterItem);
                }

                this.load(true, false);
            }

            return true;
        }
    }
    return WithFilters;
}
