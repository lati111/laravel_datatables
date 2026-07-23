/**
 * Mixin that adds filter functionality to a dataprovider, including checkbox, input, select,
 * and form-based filters with dynamic operator and value selection.
 */
import type {DataproviderCore} from "../DataproviderCore";
import {Filter} from "../Data/Filter";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import {DatalistFilterError} from "../Exceptions/DatalistFilterError";
import type {Constructor, DataRecord} from "./types";

export function FilterMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithFilters extends Base {
        /** Binds change/blur event listeners on filter checkboxes and inputs, and initializes the filter form elements. */
        protected filterSetup(): void {
            //checkboxes
            const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                this.listen(checkbox, 'change', this.load.bind(this, true, false));
            }

            //inputs
            const inputs = document.querySelectorAll('input.'+this.dataproviderID+'-filter-input:not([type="checkbox"])') as NodeListOf<HTMLInputElement>
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                this.listen(input, 'blur', this.load.bind(this, true, false));
            }

            // setup form
            this.filterForm = this.resolveElement<HTMLElement>('data-filter-form-id', '-filter-form');
            if (this.filterForm === null) {
                return;
            }

            // setup display list
            this.filterlist = this.resolveElement<HTMLElement>('data-filter-list-id', '-filter-list');

            // setup filter select
            this.filterSelect = this.filterForm.querySelector('[name="filter"]');
            if (this.filterSelect === null) {
                throw new DatalistConstructionError('Filter selector with name "filter" is missing on filter form #'+this.filterForm.id, this.errorCallback);
            }

            // operator filter select
            this.operatorSelect = this.filterForm.querySelector('[name="operator"]');
            if (this.operatorSelect === null) {
                throw new DatalistConstructionError('Operator selector with name "operator" is missing on filter form #'+this.filterForm.id, this.errorCallback);
            }

            // filter confirm button
            const confirmButton = document.getElementById(this.dataproviderID+'-filter-confirm-button') as HTMLButtonElement|null;
            if (confirmButton === null || confirmButton.tagName !== 'BUTTON') {
                throw new DatalistConstructionError('Button with id "'+this.dataproviderID+'-filter-confirm-button" is missing #'+this.filterForm.id, this.errorCallback);
            }
            this.addFilterButton = confirmButton;

            this.listen(this.addFilterButton, 'click', this.addFilterEvent.bind(this));
        }

        /** Fetches available filters from the server and populates the filter select dropdown. */
        protected async filterInit(): Promise<void> {
            if (this.filterSelect !== null) {
                const data = await this.fetchData(this.buildFilterUrl());

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

                this.listen(this.filterSelect, 'change', this.onFilterSelectEvent.bind(this));
            }

            this.resetFilterSelects();
        }

        /** Adds a filter from the filter form, creates its display element, and triggers a reload. */
        protected addFilter(displayString:string, filter:string, operator:string, value:string|null = null, init: boolean = false): boolean {
            displayString = this.formatString(displayString);

            for (const currFilter of this.filters) {
                if (currFilter.filter === filter && currFilter.operator === operator) {
                    throw new DatalistFilterError(
                        `Duplicate filter: ${filter} ${operator} already active on dataprovider #${this.dataproviderID}`,
                        this.errorCallback
                    );
                }
            }

            const filterItem = new Filter('form', filter, operator, value, displayString);
            this.filters.push(filterItem);
            this.addFilterDisplay(filterItem)

            if (this.filterAddedEvent !== null && !init) {
                this.filterAddedEvent(this, filterItem);
            }

            if (!init) {
                this.userInitiatedLoad = true;
            }
            this.load(true, false);

            return true;
        }

        /** Collects all active filters from form entries, checkboxes, and inputs into a single array. */
        protected getFilters(): Array<Filter>{
            // Persist only form/manual/dataselect-chip filters — checkbox/input/dataselect-value
            // filters are re-derived from live DOM state on every call so they cannot drift.
            this.filters = this.filters.filter(
                f => f.type !== 'checkbox' && f.type !== 'input' && f.type !== 'dataselect'
            );

            const filters: Array<Filter> = [...this.filters];

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

        /** Synchronizes checkbox checked states with the actual filter data returned from the server. */
        protected normalizeFilterCheckboxes(data: DataRecord) {
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

        /** Resets the filter form selects to their default visibility and ordering. */
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

        /** Appends a filter's display element to the filter list and links it back to the filter data. */
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

        /** Creates the DOM element used to display an active filter with a delete button. */
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
            this.listen(deleteButton, 'click', this.removeFilterEvent.bind(this, container));
            container.append(deleteButton);

            return container;
        }

        /** Handles filter select change by fetching operators and value options for the selected filter. */
        protected async onFilterSelectEvent() {
            this.resetFilterSelects();

            const filter = this.filterSelect!.value;
            const data = await this.fetchData(this.buildFilterUrl(filter));

            // set operators
            this.operatorSelect!.innerHTML = '';
            this.operatorSelect?.classList.remove('hidden');

            const operators = Array.isArray(data['operators']) ? data['operators'] : [];
            for (const operator of operators) {
                const operatorOption = document.createElement('option');
                operatorOption.value = operator['operator'];
                operatorOption.textContent = operator['text'];
                this.operatorSelect!.append(operatorOption);
            }

            await this.performOnfilterSelect(data)

            this.filterForm?.setAttribute('data-filter-type', data['type']);
        }

        private getFilterFormElement<T extends HTMLElement>(selector: string, description: string): T {
            const element = this.filterForm?.querySelector(selector) as T | null;
            if (element === null) {
                throw new DatalistConstructionError(`${description} not found on dataprovider #${this.dataproviderID}`, this.errorCallback);
            }
            return element;
        }

        /**
         * Builds `${this.url}/filters` safely, preserving any existing path/query on `this.url`.
         * Appends `/filters` to the path (once) and optionally sets a `?filter=` query param.
         */
        private buildFilterUrl(filter?: string): string {
            const url = new URL(this.url, window.location.origin);
            if (!url.pathname.endsWith('/filters')) {
                url.pathname = url.pathname.replace(/\/?$/, '/filters');
            }
            if (filter !== undefined) {
                url.searchParams.set('filter', filter);
            }
            return url.toString();
        }

        /** Configures the appropriate value input element based on the selected filter's type. */
        protected async performOnfilterSelect(data: DataRecord) {
            switch (data['type']) {
                case 'select':
                    const select = this.getFilterFormElement<HTMLSelectElement>('select[name="select"].filter-value-select', 'Value select with name `select`');
                    select.classList.remove('hidden');
                    select.innerHTML = '';

                    const options = Array.isArray(data['options']) ? data['options'] : [];
                    for (const selectData of options) {
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
                    const numberInput = this.getFilterFormElement<HTMLInputElement>('input[name="number"][type="number"].filter-value-select', 'Value number input with name `number`');
                    const numMin = data['options']?.['min'];
                    const numMax = data['options']?.['max'];
                    // Server returns null when there are no rows — default to empty string.
                    numberInput.min = (numMin === null || numMin === undefined) ? '' : String(numMin);
                    numberInput.max = (numMax === null || numMax === undefined) ? '' : String(numMax);
                    numberInput.value = (numMin !== null && numMin !== undefined && parseInt(String(numMin)) >= 0) ? String(numMin) : '0';
                    numberInput.classList.remove('hidden');
                    break;
                case 'date':
                    const dateInput = this.getFilterFormElement<HTMLInputElement>('input[name="date"][type="date"].filter-value-select', 'Value date input with name `date`');
                    const dateMin = data['options']?.['min'];
                    const dateMax = data['options']?.['max'];
                    dateInput.value = '';
                    dateInput.min = (dateMin === null || dateMin === undefined) ? '' : String(dateMin);
                    dateInput.max = (dateMax === null || dateMax === undefined) ? '' : String(dateMax);
                    dateInput.classList.remove('hidden');
                    break;
            }
        }

        /** Reads the selected filter and operator from the form and delegates to performAddFilterEvent. */
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

        /** Extracts the value from the appropriate form input based on filter type and adds the filter. */
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
                    const select = this.getFilterFormElement<HTMLSelectElement>('select[name="select"].filter-value-select', 'Value select with name `select`');
                    value = select.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
                case 'number':
                    const numberInput = this.getFilterFormElement<HTMLInputElement>('input[name="number"][type="number"].filter-value-select', 'Value number input with name `number`');
                    value = numberInput.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
                case 'date':
                    const dateInput = this.getFilterFormElement<HTMLInputElement>('input[name="date"][type="date"].filter-value-select', 'Value date input with name `date`');
                    value = dateInput.value;
                    displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                    this.addFilter(displayString, filter, operator, value)
                    break;
            }
        }

        /** Removes a filter by its display element and triggers a reload. */
        protected async removeFilterEvent(filterElement: HTMLElement) {
            for (let i = 0; i < this.filters.length; i++) {
                const filterData = this.filters[i] as Filter;
                if (filterData.displayElement === filterElement) {
                    this.filters.splice(i, 1);
                    filterElement.remove();
                    this.userInitiatedLoad = true;
                    await this.load(true, false);
                    return;
                }
            }
        }

        /** Programmatically adds a filter without using the filter form UI. */
        public addManualFilter(filter:string, operator:string, value:string|null = null, init: boolean = false): boolean {
            const filterItem = new Filter('manual', filter, operator, value);
            this.filters.push(filterItem);
            this.addFilterDisplay(filterItem)

            if (init === false) {
                if (this.filterAddedEvent !== null) {
                    this.filterAddedEvent(this, filterItem);
                }

                // Consumers calling this publicly are effectively initiating a user-visible
                // change, so treat it as user-initiated for history-push purposes.
                this.userInitiatedLoad = true;
                this.load(true, false);
            }

            return true;
        }
    }
    return WithFilters;
}
