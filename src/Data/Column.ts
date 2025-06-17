import {DatalistColumnError} from "../Exceptions/DatalistColumnError";

export class Column {
    /** The header element for this column. */
    public header:HTMLElement|null = null;

    /** The column name. */
    public name:string;

    /** The index of this column (in order of columns found). */
    public index:number;

    /** The inline css to apply to the cell itself. */
    public cellStyling:string = '';

    /** The classes to apply to the cell itself. */
    public cellCls:string = '';

    /** The inline css to apply to the content wrapper. */
    public wrapperStyling:string = '';

    /** The classes to apply to the content wrapper. */
    public wrapperCls:string = '';

    /** The default value for this column if no value was given. */
    public defaultValue:string|null = null;

    /** The element to copy and use as a template. Inputs and textareas with the `contains-value` class are set with the column's value. */
    public template:HTMLElement|null = null;

    /** Whether the column is visible or hidden. */
    public visible:boolean = true;

    /** The function to call instead of default behavior when setting the value for a column. The cell, the value and the data. */
    public setter:Function|null = null;

    /** The function to call instead of default behavior when getting the value from a column. */
    public getter:Function|null = null;

    /** Parse the given header and save it's contents for later use. */
    constructor(header:HTMLElement, index:number) {
        this.header = header;
        this.index = index;

        const name = header.getAttribute('data-column');
        if (name === null) {
            throw new DatalistColumnError('No column name was found on the column.');
        }

        this.name = name;
        this.cellStyling = header.getAttribute('data-cell-styling') ?? '';
        this.cellCls = header.getAttribute('data-cell-cls') ?? '';
        this.wrapperStyling = header.getAttribute('data-wrapper-styling') ?? '';
        this.wrapperCls = header.getAttribute('data-wrapper-cls') ?? '';
        this.defaultValue = header.getAttribute('data-default-value');
        this.visible = header.getAttribute('data-visible') === 'true';

        if (header.hasAttribute('data-template-id')) {
            const template = document.querySelector('#'+header.getAttribute('data-template-id')!);
            if (template === null) {
                throw new DatalistColumnError('Could not find column template '+ header.getAttribute('data-template-id')!);
            }

            this.template = template as HTMLElement;
        }
    }

    /**
     * Creates a cell for a column according to the parameters
     * @param {Array} data The data array
     */
    public createCell(data:{[key:string]:any} = {}): HTMLTableCellElement {
        // Properly set value to null if missing
        if (Object.keys(data).includes(this.name) === false) {
            data[this.name] = null;
        }

        let value = data[this.name];

        // Create the cell
        const td = document.createElement('td');
        td.setAttribute('data-column', this.name);
        td.classList.value = this.cellCls;
        td.classList.add('datatableform-input');
        td.style.all = this.cellStyling;
        if (!this.visible) {
            td.classList.add('hidden');
        }

        // set default value
        if (value === null) {
            if (this.defaultValue !== null) {
                value = this.defaultValue
            } else {
                value = '';
            }
        }

        // create wrapper
        let container: HTMLElement = td;
        if (this.wrapperCls !== null) {
            container = document.createElement('div');
            container.classList.value = this.wrapperCls;
            container.style.all = this.wrapperStyling;
            container.classList.add('data-item-wrapper')
            td.append(container)
        }

        // set the contents
        if (typeof this.setter === 'function') {
            // through setter
            if (this.template !== null) {
                container.append(this.template.cloneNode(true) as HTMLElement);
            }

            this.setter(td, value, data);
        } else if (this.template !== null) {
            // through format
            container.append(this.template.cloneNode(true) as HTMLElement);

            const inputs = document.querySelectorAll('input.contains-value') as NodeListOf<HTMLInputElement>;
            for (const input of inputs) {
                input.value = value;
            }

            const textareas = document.querySelectorAll('textarea.contains-value') as NodeListOf<HTMLTextAreaElement>;
            for (const textarea of textareas) {
                textarea.textContent = value;
            }
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

    /**
     * Show this column
     */
    public show() {
        this.visible = true;
        if (this.header !== null) {
            this.header.classList.remove('hidden')

            const cells = this.header!.closest('table')!.querySelectorAll(`td[data-column="${this.name}"]`)
            for (const cell of cells) {
                cell.classList.remove('hidden');
            }
        }
    }

    /**
     * Hide this column
     */
    public hide() {
        this.visible = false;
        if (this.header !== null) {
            this.header.classList.add('hidden')

            const cells = this.header!.closest('table')!.querySelectorAll(`td[data-column="${this.name}"]`)
            for (const cell of cells) {
                cell.classList.add('hidden');
            }
        }
    }
}