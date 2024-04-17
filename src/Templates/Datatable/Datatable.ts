import {Column} from "./Data/Column";
import {ColumnHandler} from "./Data/ColumnHandler";
import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";
import {DatalistError} from "../../Exceptions/DatalistError";
import {Item} from "./Data/Item";
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
    protected columns:{[key:string]: Column} = {};
    protected columnHandlers:{[key:string]: ColumnHandler} = {};
    protected sortableHeaders:NodeListOf<Element>|null = null;

    protected sortNeutralImagePath:string|null = null;
    protected sortDescendingImagePath:string|null = null;
    protected sortAscendingImagePath:string|null = null;

    /** @type {boolean} Whether selection mode is active */
    protected selectionModeIsEnabled:boolean = false;
    /** @type {HTMLElement|null} The bar that should be shown when items are selected */
    protected actionbar:HTMLElement|null = null;
    /** @type {Array} An associative array containing all the selected items */
    protected selectedItems:{[key: string]: Item} = {};

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
    protected generateDataUrl(baseUrl:string = this.url):URL {
        const url = super.generateDataUrl(baseUrl);

        const sortData = this.getSortData();
        if (Object.keys(sortData).length > 0) {
            url.searchParams.set('sort', JSON.stringify(sortData))
        }

        return url;
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

    //| Dom operations

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