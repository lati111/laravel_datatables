import {DataTableSettings} from "../../Settings/DataTableSettings";
import {Column} from "../../Data/Column";
import {DatalistCore} from "../../DatalistCore";

export class DataTableV2 extends DatalistCore {
    /** @inheritDoc */
    public settings: DataTableSettings = new DataTableSettings();

    /** The array containing the column for this datatable */
    public columns:{[key:string]: Column} = {};

    /**
     * @inherit
     * Obtain all headers with the .datatable-header class and convert them to columns.
     */
    public constructor(dataprovider: Element|string, body: Element|string|null = null) {
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

    /** @inheritDoc */
    protected createItem(data: { [p: string]: any }): HTMLElement {
        const row = document.createElement('tr');
        const rowData:{[key: number]:HTMLTableCellElement} = {};

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
        for (let i = 0; i < length; i++) {
            if (!(i in rowData)) { // Find column if no value was set
                let key: keyof typeof this.columns;
                for (key in this.columns) {
                    if (this.columns[key].index === i) {
                        row.append(this.columns[key].createCell(data ?? {}));
                    }
                }

                continue;
            }

            row.append(rowData[i]);
        }

        return row;
    }

}