import {Column} from "./Data/Column";
import {ColumnHandler} from "./Data/ColumnHandler";
import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";
import {DatalistError} from "../../Exceptions/DatalistError";
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
    protected createItem(data:{[key:string]:any}): HTMLElement {
        const row = document.createElement('tr');
        const rowData:{[key: number]:HTMLTableCellElement} = {};

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
}