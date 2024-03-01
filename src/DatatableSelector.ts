import {Datatable} from "./Datatable";

export class DatatableSelector extends Datatable {
    /** @protected {Element|null} List where selected items should be displayed */
    protected selectList: Element | null = null;

    protected itemIdentifier: string = 'uuid';
    protected itemLabel: string = 'uuid';

    protected selectedItems:{[key: string]: Item} = {};

    /** @inheritDoc */
    protected setup() {
        super.setup();

        let selectListID = this.dataprovider.getAttribute('data-select-list-ID');
        if (selectListID === null) {
            selectListID = this.dataproviderID + '-select-list';
        }

        const selectListElement = document.querySelector('#' + selectListID)
        if (selectListElement === null) {
            throw new Error('selectorlist not defined on ' + this.dataproviderID);
        }

        this.selectList = selectListElement;

        const identifier = selectListElement.getAttribute('data-item-identifier');
        if (identifier !== null) {
            this.itemIdentifier = identifier;
        }

        const label = selectListElement.getAttribute('data-item-label');
        if (label !== null) {
            this.itemLabel = label;
        } else {
            this.itemLabel = this.itemIdentifier
        }

        const th = document.createElement('th');
        th.classList.value = selectListElement.getAttribute('data-checkbox-header-cls') ?? '';
        this.dataprovider.querySelector('thead tr')!.prepend(th)

        this.selectionInit();
    }

    protected async selectionInit() {
        const selectionUrl = this.selectList?.getAttribute('data-selection-url');
        if (selectionUrl === null || selectionUrl === undefined) {
            return;
        }

        const data = await this.fetchData(selectionUrl);

        let key: keyof typeof data;
        for (key in data) {
            const dataItem = data[key];
            const item = new Item(dataItem[this.itemIdentifier], dataItem[this.itemLabel]);
            this.selectItemEvent(item);
        }
    }

    /** @inheritDoc */
    protected generateRow(data:{[key:string]:any}): HTMLTableRowElement {
        const row = super.generateRow(data);
        const td = document.createElement('td');

        const checkbox = document.createElement('input');
        checkbox.setAttribute('data-id', data[this.itemIdentifier]);
        checkbox.type = 'checkbox';

        const item = new Item(data[this.itemIdentifier], data[this.itemLabel!])
        checkbox.addEventListener('click', this.selectItemEvent.bind(this, item));
        if (data[this.itemIdentifier] in this.selectedItems) {
            checkbox.checked = true;
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
        if (item.identifier in this.selectedItems) {
            if (item.element !== null) {
                item.element.remove();
                item.element = null;
            }

            delete this.selectedItems[item.identifier];
            return;
        }

        if (this.selectList !== null) {
            const element = document.createElement('div');
            element.classList.value = this.selectList.getAttribute('data-item-cls') ?? '';
            element.classList.add('selected-element')

            const label = document.createElement('span');
            label.classList.value = this.selectList.getAttribute('data-item-label-cls') ?? '';
            label.textContent = item.label;
            element.append(label)

            const button = document.createElement('button')
            button.classList.value = this.selectList.getAttribute('data-item-close-button-cls') ?? '';
            button.addEventListener('click', this.removeSelectedItemEvent.bind(this, item.identifier));
            button.innerHTML =  this.selectList.getAttribute('data-item-close-button-content') ?? '<span>X</span>';
            element.append(button)

            item.element = element;
            this.selectList?.append(element)
        }

        this.selectedItems[item.identifier] = item;
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