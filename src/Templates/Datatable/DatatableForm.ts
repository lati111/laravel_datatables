import {Datatable} from "./Datatable";
import {DatalistError} from "../../Exceptions/DatalistError";

/** Datatable with inline editing capabilities — adds save buttons and form submission per row. Extends {@link Datatable}. */
export class DatatableForm extends Datatable {
    protected saveUrl: string = '';
    protected saveUrlTemplate: string = '';
    public saveHandler: Function|null = null;

    public addsNewRow: boolean = true;

    protected emptyRowWhiteList: string[] = [];
    protected isEditableColumn: string|null = null;
    protected buttonColumn: string|null = null;

    protected saveButtonContent: string = '<span>Save</span>';
    protected saveButtonCls: string = '';

    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        this.emptyBody = '';

        this.isEditableColumn = this.dataprovider.getAttribute('data-is-editable-column');

        // save url
        const saveUrl = this.dataprovider.getAttribute('data-save-url');
        if (saveUrl === null || saveUrl === '') {
            throw new DatalistError('Save url not defined in datatable form #'+this.dataproviderID, this.errorCallback);
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

        if (this.saveUrl !== '') {
            this.saveUrl = this.changeUrl(this.saveUrlTemplate!, replacers);
        }
    }

    /** @inheritDoc */
    public async load(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        // Snapshot pendingLoad BEFORE calling super: if it's non-null, our call is being
        // coalesced onto an in-flight load and we must NOT add another empty row when the
        // shared promise resolves — the "owning" call will do it.
        const wasCoalesced = (this as any).pendingLoad !== null;

        await super.load(shouldResetPagination, keepContents);

        // Skip when this call was coalesced (deduplicates row inserts across rapid load() calls)
        // and when the caller is appending items (keepContents), which is not a full re-render.
        if (this.addsNewRow && !wasCoalesced && !keepContents) {
            this.addNewItem();
        }
    }

    /** Generated an unfilled row for the table */
    protected createNewItem(data:{[key:string]:any}): HTMLElement {
        let row = document.createElement('tr') as HTMLElement;
        row.classList.add('new-row');

        let key: keyof typeof this.columns;
        for (key in this.columns) {
            const column = this.columns[key]
            const cell = document.createElement('td');
            if (this.emptyRowWhiteList.length === 0 || this.emptyRowWhiteList.includes(key) === false) {
                if (column.visible === false) {
                    cell.classList.add('hidden')
                }

                cell.setAttribute('data-column', column.name)
                row.append(cell)
                continue;
            }

            row.append(column.createCell(data ?? {}));
        }

        row = this.addSaveButton(row);
        return row;
    }

    /** @inheritDoc */
    protected createItem(data:{[key:string]:any}): HTMLElement {
        let row = super.createItem(data);

        if (this.isEditableColumn === null || data[this.isEditableColumn] === true) {
            row = this.addSaveButton(row);
        }
        
        return row;
    }

    /** @inheritDoc */
    public addNewItem(): void {
        if (this.createSuffixRow !== null) {
            this.body.prepend(this.createSuffixRow({}))
        }

        super.addNewItem();

        if (this.createPrefixRow !== null) {
            this.body.prepend(this.createPrefixRow({}))
        }
    }

    /** Adds the save button to the button column */
    protected addSaveButton(row:HTMLElement): HTMLElement {
        let buttonCell = document.createElement('td');
        if (this.buttonColumn !== null) {
            const column = this.columns[this.buttonColumn];
            if (column === null || column === undefined) {
                row.append(buttonCell)
            } else {
                const existingCell = row.children[column.index] as HTMLTableCellElement | undefined;
                if (existingCell === undefined) {
                    throw new DatalistError(
                        `Button column "${this.buttonColumn}" (index ${column.index}) is out of range on datatable form #${this.dataproviderID}`,
                        this.errorCallback
                    );
                }
                buttonCell = existingCell;
            }
        } else {
            row.append(buttonCell)
        }

        const button = document.createElement('button');
        button.classList.value = this.saveButtonCls;
        button.classList.add('data-item-readonly-sensitive');
        button.classList.add('hidden-when-readonly');

        button.innerHTML = this.saveButtonContent;
        this.listen(button, 'click', this.saveRow.bind(this, row));
        
        const wrapper = buttonCell.querySelector('.data-item-wrapper');
        if (wrapper !== null) {
            wrapper.append(button);
        } else {
            buttonCell.append(button);
        }

        return row;
    }

    /** Saves a row's data through an API call */
    protected async saveRow(row:HTMLElement) {
        const formdata = new FormData();
        const inputs = row.querySelectorAll('td input.data-input, textarea.data-input, td select.data-input')
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i] as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
            if (input.name === '') {
                throw new DatalistError('input missing on input ' + input.outerHTML, this.errorCallback)
            }

            const column = this.columns[input.name];
            const value = (column.handler !== null) ? column.handler.get(input) : input.value;

            formdata.set(input.name, value);
        }

        if (this.saveHandler !== null) {
            await this.saveHandler(row, this.saveUrl, formdata);
        } else {
            await this.postData(this.saveUrl, formdata);
        }

        if (row.classList.contains('new-row')) {
            row.classList.remove('data-item-readonly-sensitive');
            row.classList.remove('hidden-when-readonly');
        }
    }
}
