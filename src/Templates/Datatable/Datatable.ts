import {Column} from "./Data/Column";
import {ColumnHandler} from "./Data/ColumnHandler";
import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";
import {DatalistError} from "../../Exceptions/DatalistError";
import {Item} from "./Data/Item";
import {DataSelect} from "../Select/Dataselect";
import {DatalistConstructionError} from "../../Exceptions/DatalistConstructionError";
import {DatalistFilterError} from "../../Exceptions/DatalistFilterError";
import {Filter} from "../../Data/Filter";
/**
 * @inheritDoc
 *
 * @property {Array} columns An associative array containing all the columns
 * @property {Array} columnHandlers An associative array containing all the custom column handlers before adding them to the columns
 * @property {NodeListOf<Element>} sortableHeaders A list of headers that can be sorted on
 * @property {string|null} sortNeutralImagePath The image used to show that sort mode is neutral on a column. When null no image is shown
 * @property {string|null} sortDescendingImagePath The image used to show that sort mode is descending on a column. When null no image is shown
 * @property {string|null} sortAscendingImagePath The image used to show that sort mode is ascending on a column. When null no image is shown
 */

export class Datatable extends AbstractDataproviderTemplate {
    //| Column properties

    protected columns:{[key:string]: Column} = {};
    protected columnHandlers:{[key:string]: ColumnHandler} = {};
    protected sortableHeaders:NodeListOf<Element>|null = null;

    protected sortNeutralImagePath:string|null = null;
    protected sortDescendingImagePath:string|null = null;
    protected sortAscendingImagePath:string|null = null;

    //| Filter properties
    /** @type {HTMLElement|null} The form used to set filters */
    protected filterForm: HTMLElement|null = null;

    /** @type {HTMLElement|null} The element used to display filters */
    protected filterlist: HTMLElement|null = null;

    /** @type {HTMLButtonElement|null} The button in the filterform that adds the selected filter */
    protected addFilterButton: HTMLButtonElement|null = null;

    /** @type {HTMLSelectElement|null} The element select a filter in the filter form */
    protected filterSelect: HTMLSelectElement|null = null;

    /** @type {HTMLSelectElement|null} The element select an operator in the filter form */
    protected operatorSelect: HTMLSelectElement|null = null;

    /** @type {DataSelect|null} The dataselect for values in the filter form */
    protected valueDataSelect: DataSelect|null = null;

    /** @type {Element|null} The container for the dataselect */
    protected valueDataSelectContainer: HTMLElement|null = null;

    /** @type {Function|null} The event function called after an event is added. Passes dataprovider and filter */
    public filterAddedEvent: Function|null = null;

    //| Actionbar properties

    /** @type {Function|null} Create a row to be put before the main row. Is given the data array as a parameter. */
    public createPrefixRow: Function|null = null;

    /** @type {Function|null} Create a row to be put after the main row. Is given the data array as a parameter. */
    public createSuffixRow: Function|null = null;

    /** @type {boolean} Whether selection mode is active */
    protected selectionModeIsEnabled:boolean = false;
    /** @type {HTMLElement|null} The bar that should be shown when items are selected */
    protected actionbar:HTMLElement|null = null;


    //| Selection properties

    /** @type {Array} An associative array containing all the selected items */
    public selectedItems:{[key: string]: Item} = {};

    /** @type {boolean} If select events should be fired */
    protected allowSelectEvents: boolean = true;
    /** @type {Function|null} Callback to trigger when an item is selected */
    public onSelectEvent: Function| null = null;
    /** @type {Function|null} Callback to trigger when an item is deselected */
    public onDeselectEvent: Function| null = null;



    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        // headers
        this.initColumns();

        // sortable headers
        this.sortableHeaders = this.dataprovider.querySelectorAll('thead th.datatable-header[data-sortable="true"]');
        for (const header of this.sortableHeaders) {
            const boundFunc = this.toggleSortableHeader.bind(this, header)
            header.addEventListener('click', boundFunc);
        }

        // sort header icons
        this.sortNeutralImagePath = this.dataprovider.getAttribute('data-sort-img-neutral');
        this.sortDescendingImagePath = this.dataprovider.getAttribute('data-sort-img-desc');
        this.sortAscendingImagePath = this.dataprovider.getAttribute('data-sort-img-asc');

        // setup selection mode
        if (this.dataprovider.getAttribute('data-selection-mode') === 'true') {
            this.selectionModeIsEnabled = true;
            this.setupSelectionMode();
        }

        // setup filters

        this.filterSetup();
    }

    /** @inheritDoc */
    public async init(): Promise<void> {
        await super.init();

        await this.filterInit()
    }

    /**
     * Sets up the necessary elements for selection mode
     * @return void
     */
    protected setupSelectionMode() {
        //create checkbox header
        const th = document.createElement('th');
        th.classList.value = this.dataprovider.getAttribute('data-checkbox-header-cls') ?? '';
        this.dataprovider.querySelector('thead tr')!.prepend(th)

        // setup action bar
        const actionbarID = this.dataprovider.getAttribute('data-actionbar-id') ?? this.dataproviderID + '-action-bar';
        this.actionbar = document.querySelector('#'+actionbarID);
        this.actionbar?.classList.add('hidden');
    }

    /**
     * Initializes the columns for the datatable
     * @return void
     */
    private initColumns() {
        const headers = this.dataprovider.querySelectorAll('thead th.datatable-header');

        let index = 0;
        for (const header of headers) {
            const name = header.getAttribute('data-column')!;
            const column = new Column(name, index)

            column.visible = (header.getAttribute('data-visible') ?? 'false') === 'true'
            column.format = header.getAttribute('data-format');
            column.default = header.getAttribute('data-default');
            column.cellCls = header.getAttribute('data-cell-cls') ?? '';
            column.wrapperCls = header.getAttribute('data-wrapper-cls') ?? '';

            const size = header.getAttribute('data-size');
            if (size !== null) {
                column.size = parseInt(size);
            }

            if (this.columnHandlers[name] !== undefined) {
                column.handler = this.columnHandlers[name];
            }

            this.columns[name] = column;

            index++;
        }
    }

    /**
     * Setup up the filter functionality
     */
    protected filterSetup(): void {
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

        // setup dataselect
        const valueSelect = this.filterForm.querySelector('.dataselect-container [name="dataselect"]');
        if (valueSelect !== null) {
            if (valueSelect.id === null) {
                valueSelect.id = this.dataproviderID + '-value-dataselect';
            }

            this.valueDataSelect = new DataSelect(valueSelect.id)
            this.valueDataSelectContainer = this.filterForm.querySelector('.dataselect-container');
        }
    }

    /**
     * Initialize the filter functionality
     */
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

        if (this.valueDataSelect !== null) {
            await this.valueDataSelect.init();
        }

        this.resetFilterSelects();
    }

    //| Events

    /**
     * Marks/unmarks an item as selected
     * @param {Item} item The item to mark/unmark
     * @return void
     */
    public selectItemEvent(item:Item): void {
        if (item.identifier in this.selectedItems) {
            //unmark
            this.deselectItem(item);
        } else {
            //mark
            this.selectItem(item);
        }

        if (Object.keys(this.selectedItems).length > 0) {
            this.actionbar?.classList.remove('hidden')
        } else {
            this.actionbar?.classList.add('hidden')
        }
    }

    /**
     * Mark an item as selected
     * @param {Item} item The item to mark
     */
    protected selectItem(item:Item) {
        // add item to internal array
        this.selectedItems[item.identifier] = item;

        // fire event
        if (this.onSelectEvent !== null && this.allowSelectEvents) {
            this.onSelectEvent(this, item.identifier)
        }
    }

    /**
     * Unmark an item as selected
     * @param {Item} item The item to unmark
     */
    protected deselectItem(item:Item) {
        // fire event callback if it exists
        if (this.onDeselectEvent !== null && this.allowSelectEvents) {
            this.onDeselectEvent(this, item.identifier)
        }

        // delete item from internal array
        delete this.selectedItems[item.identifier];
        return;
    }

    //| Header operations

    /**
     * Toggle a header element to it's next mode from neutral -> desc -> asc -> neutral...
     * @param {Element} header The header element
     * @return void
     */
    public toggleSortableHeader(header:Element) {
        let sortdir = header.getAttribute('data-sort-dir');
        const img = header.querySelector('img.sort-image') as HTMLImageElement|null;
        if (img === null) {
            throw new DatalistError("Sort image undefined on header", this.errorCallback);
        }

        switch (sortdir) {
            case 'neutral':
                this.setSortableHeader(header, 'desc');
                break;
            case 'desc':
                this.setSortableHeader(header, 'asc');
                break;
            case 'asc':
            default:
                this.setSortableHeader(header, 'neutral');
                break;
        }

        this.load(true);
    }

    /**
     * Set a sortable header's direction
     * @param {Element} header The header element
     * @param {string} sortdir The direction to sort it (can be neutral, desc or asc)
     * @return void
     */
    public setSortableHeader(header:Element, sortdir:string) {
        const img = header.querySelector('img.sort-image') as HTMLImageElement|null;

        switch (sortdir) {
            case 'neutral':
                if (img !== null && this.sortNeutralImagePath !== null) {
                    img.src = this.sortNeutralImagePath;
                }
                break;
            case 'desc':
                if (img !== null && this.sortDescendingImagePath !== null) {
                    img.src = this.sortDescendingImagePath;
                }
                break;
            case 'asc':
                if (img !== null && this.sortAscendingImagePath !== null) {
                    img.src = this.sortAscendingImagePath;
                }
                break;
        }

        header.setAttribute('data-sort-dir', sortdir);
    }

    /**
     * Assign a custom setter to a column
     * @param {string} columnId The column to assign the setter to
     * @param {Function} setter The setter function to be assigned. The setter have the element and value as it's parameters
     * @return {HTMLTableRowElement} The created row
     */
    public setColumnSetter(columnId: string, setter: Function): void {
        if (this.columnHandlers[columnId] === undefined) {
            this.columnHandlers[columnId]  = new ColumnHandler();
        }

        this.columnHandlers[columnId] .setter = setter;
    }

    /**
     * Assign a custom getter to a column
     * @param {string} columnId The column to assign the getter to
     * @param {Function} getter The getter function to be assigned. The setter have the element and value as it's parameters
     * @return {HTMLTableRowElement} The created row
     */
    public setColumnGetter(columnId: string, getter: Function): void {
        if (this.columnHandlers[columnId] === undefined) {
            this.columnHandlers[columnId] = new ColumnHandler();
        }

        this.columnHandlers[columnId].getter = getter;
    }

    //| Data operations

    /**
     * Gets the sort data as an associative array
     * @return {array} Sort data as associative array
     */
    protected getSortData():{[key:string]: string} {
        const array:{[key:string]: string} = {};
        if (this.sortableHeaders === null) {
            return array;
        }

        for (let i = 0; i < this.sortableHeaders.length; i++) {
            const header = this.sortableHeaders[i] as Element;
            const column = header.getAttribute(('data-column'));
            if (column === null) {
                continue;
            }

            const direction = header.getAttribute(('data-sort-dir'));
            if (direction === 'asc' || direction === 'desc') {
                array[column] = direction;
            }
        }

        return array;
    }

    /** @inheritDoc */
    protected getStorableData():{[key: string]: any} {
        const data = super.getStorableData();
        const sortData = this.getSortData();
        if (Object.keys(sortData).length > 0) {
            data.sort = JSON.stringify(sortData);
        }

        return data;
    }

    /** @inheritDoc */
    protected loadDataFromStorage(data:{[key:string]: any}):void {
        super.loadDataFromStorage(data);

        if (this.sortableHeaders !== null && data.sort !== undefined) {
            const sorts = JSON.parse(data.sort);

            for (let i = 0; i < this.sortableHeaders.length; i++) {
                const header = this.sortableHeaders[i] as Element;
                const column = header.getAttribute(('data-column'));
                if (column === null) {
                    continue;
                }

                if (sorts[column] !== undefined) {
                    this.setSortableHeader(header, sorts[column]);
                }
            }
        }
    }

    /** @inheritDoc */
    public async load(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        await super.load(shouldResetPagination, keepContents);

        if (Object.keys(this.selectedItems).length > 0) {
            this.actionbar?.classList.remove('hidden')
        } else {
            this.actionbar?.classList.add('hidden')
        }
    }


    //| Url operations

    /** @inheritDoc */
    protected generateDataUrl(baseUrl:string = this.url): URL {
        const url = super.generateDataUrl(baseUrl);

        const sortData = this.getSortData();
        if (Object.keys(sortData).length > 0) {
            url.searchParams.set('sort', JSON.stringify(sortData))
        }

        return url;
    }

    //| Data storage operations

    /** @inheritDoc */
    protected getStorableFilterData(): Array<any>|null {
        const filters = this.getFilters();
        if (filters.length > 0) {
            const filterArray = [];
            for (const filter of filters) {
                let json: any ={
                    'filter': filter.filter,
                    'operator': filter.operator,
                    'value': filter.value,
                };

                if (filter.display !== null) {
                    json['display'] = filter.display;
                }

                filterArray.push(json);
            }

            return filterArray;
        }

        return null;
    }

    /** @inheritDoc */
    protected loadStoredFilterData(data:{[key:string]: any}): void {
        if (typeof data.filters === 'object') {
            for (const key in data.filters) {
                const filter = data.filters[key];
                if (filter['display'] !== undefined && filter['display'] !== null) {
                    this.addFilter(filter['display'], filter['filter'], filter['operator'], filter['value'] ?? null, true);
                    continue;
                }

                const filterCheckbox = document.querySelector('input[type="checkbox"][name="'+filter['filter']+'"].'+this.dataproviderID+'-filter-checkbox') as HTMLInputElement|null;
                if (filterCheckbox === null) {
                    continue;
                }

                if (filterCheckbox.getAttribute('data-checked-operator') === filter['operator']) {
                    if (Object.hasOwn(filter, 'value') && filterCheckbox.getAttribute('data-checked-value') !== filter['value']) {
                        continue;
                    }

                    filterCheckbox.checked = true;
                }
            }
        }
    }

    //| Filter operations

    /**
     * Inserts a new filter in the filter array
     * @param {string} displayString The formatted string to display for this filter
     * @param {string} filter The filter to add
     * @param {string} operator The operator for the filter
     * @param {string|null} value The filter value
     * @param {boolean} init Whether or not it is run in init mode (disables events)
     * @return {boolean} Whether or not this succeded
     */
    protected addFilter(displayString:string, filter:string, operator:string, value:string|null = null, init: boolean = false): boolean {
        displayString = this.formatString(displayString);

        for (const filterArray in this.filters) {
            const currFilter = filterArray as unknown as Filter;
            if (currFilter.filter === filter || currFilter.operator === operator) {
                throw new Error('Duplicate filter error');
            }
        }

        const filterItem = new Filter(filter, operator, value, displayString);
        this.filters.push(filterItem);
        this.addFilterDisplay(filterItem)

        if (this.filterAddedEvent !== null && !init) {
            this.filterAddedEvent(this, filterItem);
        }

        this.load(true, false);

        return true;
    }

    //| Dom operations

    /** @inheritDoc */
    protected addItem(data:{[key:string]:any}): void {
        if (this.createPrefixRow !== null) {
            this.body.append(this.createPrefixRow(data))
        }

        super.addItem(data);

        if (this.createSuffixRow !== null) {
            this.body.append(this.createSuffixRow(data))
        }
    }

    /** @inheritDoc */
    protected createItem(data:{[key:string]:any}): HTMLElement {
        const row = document.createElement('tr');
        const rowData:{[key: number]:HTMLTableCellElement} = {};

        if (this.selectionModeIsEnabled) {
            const td = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.setAttribute('data-id', data[this.itemIdentifierKey!]);
            checkbox.classList.add('data-item-readonly-sensitive');
            checkbox.name = 'selection-checkbox'
            checkbox.type = 'checkbox';
            td.append(checkbox);

            const item = new Item(data[this.itemIdentifierKey!], data[this.itemLabelKey!])
            if (data[this.itemIdentifierKey!] in this.selectedItems) {
                checkbox.checked = true;
            }

            checkbox.addEventListener('click', this.selectItemEvent.bind(this, item));
            row.append(td);
        }

        let key: keyof typeof data;
        for (key in data) {
            if (key in this.columns) {
                const column = this.columns[key];
                rowData[column.index] = column.createCell((data[key] ?? '').toString());
            }
        }

        const length = Object.keys(this.columns).length;
        for (let i = 0; i < length; i++) {
            if (!(i in rowData)) {
                //find column if no value was set
                let key: keyof typeof this.columns;
                for (key in this.columns) {
                    if (this.columns[key].index === i) {
                        row.append(this.columns[key].createCell(''));
                    }
                }

                continue;
            }

            row.append(rowData[i]);
        }

        return row;
    }

    /**
     * Reset the filter select form back to it's basic form
     */
    protected resetFilterSelects() {
        this.filterSelect!.style.order = '1';

        if (this.operatorSelect !== null) {
            this.operatorSelect.classList.add('hidden');
            this.operatorSelect.style.order = '2'
        }

        if (this.valueDataSelect !== null) {
            this.valueDataSelectContainer!.classList.add('hidden');
            this.valueDataSelectContainer!.style.order = '3'
        }

        const valueSelects = this.filterForm?.querySelectorAll('.filter-value-select') as NodeListOf<HTMLElement>;
        for (const valueSelect of valueSelects) {
            valueSelect.classList.add('hidden');
            valueSelect.style.order = '3'
        }
    }

    /**
     * Adds a filter to the filterlist display
     * @param {Filter} filter The filter to add
     * @return void
     */
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

    /**
     * Create a display item for a filter
     * @param {Filter} filter The filter to create a display for
     * @return {HTMLElement} The created element
     */
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

    //| Filter events

    /**
     * An event that handles filter selection
     */
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

        // active selectors
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
            case 'data-select':
                if (this.valueDataSelect === null) {
                    throw new DatalistConstructionError('Value dataselect not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                }

                this.valueDataSelectContainer?.classList.remove('hidden');
                this.valueDataSelect.itemIdentifierKey = data['options']['identifier'];
                this.valueDataSelect.itemLabelKey = data['options']['label'];
                await this.valueDataSelect.modifyUrl({
                    'URL': data['options']['url'],
                });

                break;
        }

        this.filterForm?.setAttribute('data-filter-type', data['type']);
    }

    /**
     * An event that adds the currently selected filter to the filter list
     */
    protected async addFilterEvent() {
        const filter = this.filterSelect?.value ?? null;
        if (filter === null) {
            throw new DatalistFilterError('No filter is selected on the filter form from dataprovider #'+this.dataproviderID, this.errorCallback);
        }

        const operator = this.operatorSelect?.value ?? null;
        if (operator === null) {
            throw new DatalistFilterError('No operator is selected on the filter form from dataprovider #'+this.dataproviderID, this.errorCallback);
        }

        let value = null;
        let displayString = '';
        switch (this.filterForm?.getAttribute('data-filter-type') ?? '') {
            case 'bool':
                value = (operator === '=') ? '1' : '0'
                displayString = this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + filter;
                break;
            case 'select':
                const select = this.filterForm?.querySelector('select[name="select"].filter-value-select') as HTMLSelectElement|null;
                if (select === null) {
                    throw new DatalistConstructionError('Value select with name `select` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                }

                value = select.value;
                displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                break;
            case 'number':
                const numberInput = this.filterForm?.querySelector('input[name="number"][type="number"].filter-value-select') as HTMLInputElement|null;
                if (numberInput === null) {
                    throw new DatalistConstructionError('Value number input with name `number` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                }

                value = numberInput.value;
                displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                break;
            case 'date':
                const dateInput = this.filterForm?.querySelector('input[name="date"][type="date"].filter-value-select') as HTMLInputElement|null;
                if (dateInput === null) {
                    throw new DatalistConstructionError('Value date input with name `date` not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                }

                value = dateInput.value;
                displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                break;
            case 'data-select':
                if (this.valueDataSelect === null) {
                    throw new DatalistConstructionError('Value dataselect not found on dataprovider #'+this.dataproviderID, this.errorCallback)
                }

                value = this.valueDataSelect.getSelectedItem();
                displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
                break;
        }

        this.addFilter(displayString, filter, operator, value)
    }

    /**
     * An event that deletes the filter this event triggered for
     */
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

    //| Public methods

    /**
     * Gets an array of identifier strings of all the selected items
     * @return {string[]} Array of identifier strings
     */
    public getSelectedItems():string[] {
        const arr = [];

        let key: keyof typeof this.selectedItems;
        for (key in this.selectedItems) {
            arr.push(this.selectedItems[key].identifier);
        }

        return arr;
    }

    /**
     * Sets the visibility of the actionbar
     * @param {boolean} visible Whether to make the actionbar visible
     */
    public setActionbarVisibility(visible:boolean): void {
        if (visible) {
            this.actionbar?.classList.remove('hidden');
        } else {
            this.actionbar?.classList.add('hidden');
        }
    }
}