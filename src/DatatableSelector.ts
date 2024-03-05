import {Datatable} from "./Datatable";

export class DatatableSelector extends Datatable {
    /** @protected {Element|null} List where selected items should be displayed */
    protected selectList: Element | null = null;

    protected itemIdentifier: string = 'uuid';
    protected itemLabel: string = 'uuid';

    protected selectedItems:{[key: string]: Item} = {};

    /** @protected {string|null} Url to get list of selected items from */
    protected selectionUrl: string | null = null;

    /** @protected {string|null} Url to get list of selected items from when url is dynamic */
    protected selectionUrlTemplate: string | null = null;

    /** @protected {boolean} If select events should be fired */
    protected allowSelectEvents: boolean = true;

    /** @protected {Function|null} Callback to trigger when an item is selected */
    public onSelectEvent: Function| null = null;

    /** @protected {Function|null} Callback to trigger when an item is deselected */
    public onDeselectEvent: Function| null = null;

    /** @inheritDoc */
    protected setup() {
        super.setup();

        //set selectlist element
        let selectListID = this.dataprovider.getAttribute('data-select-list-ID');
        if (selectListID === null) {
            selectListID = this.dataproviderID + '-select-list';
        }

        const selectListElement = document.querySelector('#' + selectListID)
        if (selectListElement === null) {
            throw new Error('selectorlist not defined on ' + this.dataproviderID);
        }

        this.selectList = selectListElement;

        //set item identifier
        const identifier = selectListElement.getAttribute('data-item-identifier');
        if (identifier !== null) {
            this.itemIdentifier = identifier;
        }

        //set item label
        const label = selectListElement.getAttribute('data-item-label');
        if (label !== null) {
            this.itemLabel = label;
        } else {
            this.itemLabel = this.itemIdentifier
        }

        //create checkbox header
        const th = document.createElement('th');
        th.classList.value = selectListElement.getAttribute('data-checkbox-header-cls') ?? '';
        this.dataprovider.querySelector('thead tr')!.prepend(th)

        //set selection preload urls
        this.selectionUrl = this.selectList?.getAttribute('data-selection-url');
        this.selectionUrlTemplate = this.selectionUrl

        //set readonly
        this.readonly = (this.selectList?.getAttribute('data-readonly') === 'true') ?? false;
    }

    /** @inheritDoc */
    public async init(): Promise<void> {
        await this.loadSelections();
        await super.init();
    }

    /**
     * Load the selections through the API
     * @return void
     */
    protected async loadSelections() {
        if (this.selectionUrl === null || this.selectionUrl === undefined || this.blockLoading) {
            return;
        }

        this.selectList!.innerHTML = '';
        this.selectedItems = {};

        const data = await this.fetchData(this.selectionUrl);

        this.allowSelectEvents = false;

        let key: keyof typeof data;
        for (key in data) {
            const dataItem = data[key];
            const item = new Item(dataItem[this.itemIdentifier], dataItem[this.itemLabel]);
            this.selectItemEvent(item);
        }

        this.allowSelectEvents = true;
    }

    /** @inheritDoc */
    protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
        super.changeUrls(replacers)

        if (this.selectionUrl !== null) {
            this.selectionUrl = this.changeUrl(this.selectionUrlTemplate!, replacers);
        }

        await this.loadSelections();
    }

    /** @inheritDoc */
    protected generateRow(data:{[key:string]:any}): HTMLTableRowElement {
        const row = super.generateRow(data);
        const td = document.createElement('td');

        const checkbox = document.createElement('input');
        checkbox.setAttribute('data-id', data[this.itemIdentifier]);
        checkbox.type = 'checkbox';

        const item = new Item(data[this.itemIdentifier], data[this.itemLabel!])
        if (data[this.itemIdentifier] in this.selectedItems) {
            checkbox.checked = true;
        }

        if (this.readonly) {
            checkbox.setAttribute('disabled', 'disabled');
        } else {
            checkbox.addEventListener('click', this.selectItemEvent.bind(this, item));
        }

        td.append(checkbox);
        row.prepend(td)
        return row;
    }

    /**
     * Marks/unmarks an item as selected
     * @param {Item} item The item to mark/unmark
     * @return void
     */
    public selectItemEvent(item:Item): void {
        //unmark
        if (item.identifier in this.selectedItems) {
            if (item.element !== null) {
                item.element.remove();
                item.element = null;
            }

            if (this.onDeselectEvent !== null && this.allowSelectEvents) {
                this.onDeselectEvent(this, item.identifier)
            }

            delete this.selectedItems[item.identifier];
            return;
        }

        //mark
        if (this.selectList !== null) {
            const element = document.createElement('div');
            element.classList.value = this.selectList.getAttribute('data-item-cls') ?? '';
            element.classList.add('selected-element')

            const label = document.createElement('span');
            label.classList.value = this.selectList.getAttribute('data-item-label-cls') ?? '';
            label.textContent = item.label;
            element.append(label)

            if (this.readonly === false) {
                const button = document.createElement('button')
                button.classList.value = this.selectList.getAttribute('data-item-close-button-cls') ?? '';
                button.addEventListener('click', this.removeSelectedItemEvent.bind(this, item.identifier));
                button.innerHTML =  this.selectList.getAttribute('data-item-close-button-content') ?? '<span>X</span>';
                element.append(button)
            }

            item.element = element;
            this.selectList?.append(element)
        }

        this.selectedItems[item.identifier] = item;
        if (this.onSelectEvent !== null && this.allowSelectEvents) {
            this.onSelectEvent(this, item.identifier)
        }

    }

    /**
     * Event that removes the selected iten
     * @param {string} identifier The identifier of element
     * @param {Event} e The event
     * @return void
     */
    public removeSelectedItemEvent(identifier:string, e:Event) {
        const element = (e.target as Element).closest('.selected-element') as Element;
        element.remove();

        if (this.onDeselectEvent !== null && this.allowSelectEvents) {
            this.onDeselectEvent(this, identifier)
        }

        if (this.selectList !== null) {
            const checkbox = this.body.querySelector('input[data-id="'+identifier+'"]') as HTMLInputElement|null
            if (checkbox !== null) {
                checkbox.checked = false;
            }
        }
    }

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
}

class Item {
    public readonly identifier:string;
    public readonly label:string;
    public element:Element|null = null;

    constructor(identifier:string, label:string = identifier) {
        this.identifier = identifier;
        this.label = label;
    }
}