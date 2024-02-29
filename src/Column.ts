export class Column {
    /** @protected {string} The column name according to the database */
    name:string;

    /** @protected {number} The index of the column when it comes to order in the table */
    index:number;

    /** @protected {string} The default value for a cell if none is set */
    default:string|null = null;

    /** @protected {string|null} The format for the content cell. [VALUE] will be replaces with the cell value */
    format:string|null = null;

    /** @protected {boolean|null} If the column should be visible or not */
    visible:boolean = true;

    constructor(name:string, index:number) {
        this.name = name;
        this.index = index;
    }

    /**
     * Creates a cell for a column according to the parameters
     * @param value The value for this cell
     */
    public createCell(value:string|null): HTMLTableCellElement {
        const td = document.createElement('td');
        if (!this.visible) {
            td.classList.add('hidden');
        }

        if (value === null) {
            if (this.default !== null) {
                value = this.default
            } else {
                value = '';
            }
        }

        if (this.format !== null) {
            td.innerHTML = this.format.replace('[VALUE]', value);
        } else {
            td.innerHTML = value;
        }

        return td;
    }
}