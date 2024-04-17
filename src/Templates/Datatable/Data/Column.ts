/**
 * @property {string} name The column name according to the database
 * @property {number} index The index of the column when it comes to order in the table
 * @property {number|null} size The percentage of the row this item should take up
 * @property {string} cellCls Additional classes for the cell
 * @property {string} default The default value for a cell if none is set
 * @property {string|null} format The format for the content cell. [VALUE] will be replaces with the cell value
 * @property {boolean} visible If the column should be visible or not. True by default
 */
import {ColumnHandler} from "./ColumnHandler";

export class Column {
    public name:string;
    public index:number;
    public size:number|null = null;
    public cellCls:string = '';
    /** @type {string} Additional classes for the wrapper */
    public wrapperCls:string|null = null;
    public default:string|null = null;
    public format:string|null = null;
    public visible:boolean = true;
    public handler:ColumnHandler|null = null;

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
        td.setAttribute('data-column', this.name);
        td.classList.value = this.cellCls;
        td.classList.add('datatableform-input');
        if (!this.visible) {
            td.classList.add('hidden');
        }

        // set default value
        if (value === null) {
            if (this.default !== null) {
                value = this.default
            } else {
                value = '';
            }
        }

        // set size
        if (this.size !== null) {
            td.style.width = this.size + '% !important'
        }

        // create wrapper
        let container: HTMLElement = td;
        if (this.wrapperCls !== null) {
            container = document.createElement('div');
            container.classList.value = this.wrapperCls;
            td.append('container')
        }

        // set the contents
        if (typeof this.handler?.setter === 'function') {
            // through setter
            if (this.format !== null) {
                container.innerHTML = this.format;
            }

            this.handler.set(td, value);
        } else if (this.format !== null) {
            // through format
            container.innerHTML = this.format.replace(/\[value]/gmi, value);
        } else {
            // through plain text
            container.innerHTML = value;
        }

        // return td without wrapper
        if (this.wrapperCls === null) {
            return container as HTMLTableCellElement;
        }

        // return td with wrapper
        return td;
    }
}