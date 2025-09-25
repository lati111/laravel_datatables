import {DataTableSettings} from "../../Settings/DataTableSettings";
import {DatalistCore} from "../../DatalistCore";
import {Column} from "../../Data/Column";

export class DataTableV2 extends DatalistCore {
    /** @inheritDoc */
    public settings: DataTableSettings = new DataTableSettings();

    /** The array containing the column for this datatable */
    public columns:{[key:string]: Column} = {};

    /** The function that creates a prefix row. If no element is returned no row is inserted. */
    public prefixRowCreator: Function|null = null;

    /** The function that creates a suffix row. If no element is returned no row is inserted. */
    public suffixRowCreator: Function|null = null;

    /**
     * @inherit
     * Obtain all headers with the .datatable-header class and convert them to columns.
     */
    public constructor(dataprovider: Element|string, body: Element|string|null = null, paginationElement: HTMLElement|null = null) {
        super(dataprovider, body);

        // Obtain column data
        const headers = this.getOverarchingContainer().querySelectorAll('.datatable-header') as NodeListOf<HTMLElement>;

        let index = 0;
        for (const header of headers) {
            const name = header.getAttribute('data-column')!;
            this.columns[name] = new Column(header, index);
            index++;
        }
    }

    /**| Data */

    /**| Items */

    /** @inheritDoc */
    public addItem(data:{[key:string]:any}): void {
        // Add prefix row
        if (this.prefixRowCreator !== null) {
            const prefixRow = this.prefixRowCreator(data) as HTMLTableRowElement|null;
            if (prefixRow !== null) {
                if (prefixRow.tagName === 'TR') {
                    this.datalistBody.append(prefixRow)
                }
            }
        }

        // Add row
        super.addItem(data);

        // Add suffix row
        if (this.suffixRowCreator !== null) {
            const suffixRow = this.suffixRowCreator(data) as HTMLTableRowElement|null;
            if (suffixRow !== null) {
                if (suffixRow.tagName === 'TR') {
                    this.datalistBody.append(suffixRow)
                }
            }
        }
    }

    /** @inheritDoc */
    protected createItem(data: { [p: string]: any }): HTMLElement {
        const row = document.createElement('tr');
        const rowData:{[key: number]:HTMLTableCellElement} = {};
        let buttonsAdded = false;

        let container: HTMLElement = row;
        // TODO add form mode
        // if (this.settings.isForm) {
        //     const form = document.createElement('form');
        //     row.append(form);
        //     container = form
        // }

        // Create cells for columns
        let key: keyof typeof data;
        for (key in data) {
            if (key in this.columns) {
                const column = this.columns[key];
                rowData[column.index] = column.createCell(data ?? {});
            }
        }

        // Add cells to row in column order
        const length = Object.keys(this.columns).length;
        for (let i = 0; i <= length; i++) {
            if (!(i in rowData)) { // Find column if no value was set
                let key: keyof typeof this.columns;
                for (key in this.columns) {
                    if (this.columns[key].index === i) {
                        container.append(this.columns[key].createCell(data ?? {}));
                    }
                }

                continue;
            }

            container.append(rowData[i]);
        }

        return container;
    }

    /**
     * Creates a cell containing buttons for a row.
     * @param isNew Whether this is a new uninstantiated row, or a regular data row
     * @protected
     */
    protected createButtonCell(isNew: boolean) {
        if ('buttons' in this.columns) {
            console.log('nope')
        }

        const column = this.columns['buttons'];

        const cell = document.createElement('td');

    }

}