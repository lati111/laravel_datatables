import {Datatable} from "./Datatable";

/**
 * @property {string} saveUrl The url where to save this item to
 * @property {string} saveUrlTemplate The templated url where to save this item to during a dynamic operation
 *
 * @property {string[]} emptyRowWhiteList The whitelist of allowed column in the empty row
 * @property {string|null} buttonColumn The column name of the column containing the buttons
 *
 * @property {string|null} saveButtonContent The content that should be put in the save button
 * @property {string|null} saveButtonCls Additional classes to the save button
 */

export class DatatableForm extends Datatable {
    protected saveUrl: string = '';
    protected saveUrlTemplate: string = '';
    public saveHandler: Function|null = null;

    protected emptyRowWhiteList: string[] = [];
    protected buttonColumn: string|null = null;

    protected saveButtonContent: string = '<span>Save</span>';
    protected saveButtonCls: string = '';

    /** @type {boolean} Whether or not the inputs on this form should be set to readonly */
    protected readonly: boolean = false;

    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        this.emptyBody = '';

        // save url
        const saveUrl = this.dataprovider.getAttribute('data-save-url');
        if (saveUrl === null || saveUrl === '') {
            throw new Error('Save url not defined in datatable form #'+this.dataproviderID);
        }
        this.saveUrl = saveUrl;
        this.saveUrlTemplate = saveUrl;

        // button column
        const buttonColumn = this.dataprovider.getAttribute('data-button-column');
        if (buttonColumn === null || buttonColumn === '') {
            const th = document.createElement('th');
            th.classList.value = this.dataprovider.getAttribute('data-button-header-cls') ?? '';
            this.dataprovider.querySelector('thead tr')!.append(th)
        } else {
            this.buttonColumn = buttonColumn;
        }

        // save button
        this.saveButtonCls = this.dataprovider.getAttribute('data-save-button-cls') ?? '';
        this.saveButtonContent = this.dataprovider.getAttribute('data-save-button-content') ?? this.saveButtonContent;

        // empty row whitelist
        const whitelistString = this.dataprovider.getAttribute('data-empty-row-whitelist');
        if (whitelistString !== null && whitelistString !== '') {
            this.emptyRowWhiteList = whitelistString.split(',');
        }
    }

    /** @inheritDoc */
    protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
        await super.changeUrls(replacers)

        if (this.saveUrl !== null) {
            this.saveUrl = this.changeUrl(this.saveUrlTemplate!, replacers);
        }
    }

    /** @inheritDoc */
    public async load(shouldResetPagination: boolean = false) {
        await super.load(shouldResetPagination);

        this.body.prepend(this.generateEmptyRow())
    }

    /** Generated an unfilled row for the table */
    protected generateEmptyRow() {
        let row = document.createElement('tr');

        let key: keyof typeof this.columns;
        for (key in this.columns) {
            const column = this.columns[key]
            const cell = document.createElement('td');
            if (this.emptyRowWhiteList.length === 0 || this.emptyRowWhiteList.includes(key) === false) {
                if (column.visible === false) {
                    cell.classList.add('hidden')
                }

                row.append(cell)
                continue;
            }

            row.append(column.createCell(null));
        }

        row = this.addSaveButton(row);
        return row;
    }

    /** @inheritDoc */
    protected generateRow(data:{[key:string]:any}): HTMLTableRowElement {
        const row = super.generateRow(data);
        return this.addSaveButton(row);
    }

    /** Adds the save button to the button column */
    protected addSaveButton(row:HTMLTableRowElement) {
        let cell = document.createElement('td');
        if (this.buttonColumn !== null) {
            const column = this.columns[this.buttonColumn];
            cell = row.children[column.index] as HTMLTableCellElement
        } else {
            row.append(cell)
        }

        const button = document.createElement('button');
        button.classList.value = this.saveButtonCls;
        button.innerHTML = this.saveButtonContent;
        button.addEventListener('click', this.saveRow.bind(this, row));
        cell.prepend(button)

        return row;
    }

    /** Saves a row's data through an API call */
    protected async saveRow(row:HTMLTableRowElement) {
        const formdata = new FormData();
        const inputs = row.querySelectorAll('td input.data-input, textarea.data-input, td select.data-input')
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i] as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
            if (input.name === null) {
                throw new Error('input missing on input ' + input.outerHTML)
            }

            const column = this.columns[input.name];
            const value = (column.handler !== null) ? column.handler.get(input) : input.value;

            formdata.set(input.name, value);
        }

        if (this.saveHandler !== null) {
            await this.saveHandler(row, this.saveUrl, formdata);
            return;
        }

        await this.postData(this.saveUrl, formdata);
    }

    /** Sets all inputs, selects and textareas on this datalist to readonly */
    public enableReadonlyMode() {
        if (this.readonly === true) {
            return
        }

        const items = this.body.querySelectorAll('.datatableform-input input, .datatableform-input select, .datatableform-input textarea');
        for (let i = 0; i < items.length; i++) {
            const item = items[i] as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
            if (item.hasAttribute('readony') === false) {
                item.setAttribute('readonly', 'readonly');
                item.classList.add('datalist-readonly');
            }
        }

        this.readonly = true;
    }

    /** Removes readonly from all inputs, selects and textareas on this datalist */
    public disableReadonlyMode() {
        if (this.readonly === false) {
            return
        }

        const items = this.body.querySelectorAll('.datalist-readonly');
        for (let i = 0; i < items.length; i++) {
            const item = items[i] as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
            item.removeAttribute('readonly');
        }

        this.readonly = false;
    }
}
