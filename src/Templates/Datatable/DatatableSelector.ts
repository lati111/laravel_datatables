import {Datatable} from "./Datatable";
import {DatalistConstructionError} from "../../Exceptions/DatalistConstructionError";
import {Item} from "./Data/Item";

/**
 * @inheritDoc
 *
 * @property {Element|null} selectList List where selected items should be displayed
 *
 * @property {string|null} selectionUrl Url to get list of selected items from during the pre-load phase
 * @property {string|null} selectionUrlTemplate Url to get list of selected items from during the pre-load phase when url is dynamic
 */

export class DatatableSelector extends Datatable {
    protected selectList: Element | null = null;
    public selectedItems:{[key: string]: Item} = {};
    protected selectionUrl: string | null = null;
    protected selectionUrlTemplate: string | null = null;

    /** @inheritDoc */
    protected setup() {
        super.setup();

        this.selectionModeIsEnabled = true;
        this.setupSelectionMode();

        //set selectlist element
        let selectListID = this.dataprovider.getAttribute('data-select-list-ID');
        if (selectListID === null) {
            selectListID = this.dataproviderID + '-select-list';
        }

        this.selectList = document.querySelector('#' + selectListID);

        //set selection preload urls
        this.selectionUrl = this.dataprovider.getAttribute('data-selection-url')
        this.selectionUrlTemplate = this.selectionUrl

        //check identifiers
        if (this.itemIdentifierKey === null) {
            throw new DatalistConstructionError('Attribute "data-identifier-key" is missing on dataselector $"' + this.dataproviderID + '"', this.errorCallback)
        }
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
        if (this.selectionUrl === null || this.blockLoading) {
            return;
        }

        this.selectedItems = {};
        if (this.selectList !== null) {
            this.selectList.innerHTML = '';
        }

        const data = await this.fetchData(this.selectionUrl);
        this.allowSelectEvents = false;

        let key: keyof typeof data;
        for (key in data) {
            const dataItem = data[key];
            const item = new Item(dataItem[this.itemIdentifierKey!], dataItem[this.itemLabelKey!]);
            this.selectItemEvent(item);
        }

        this.allowSelectEvents = true;
    }

    /** @inheritDoc */
    protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
        await super.changeUrls(replacers)

        if (this.selectionUrl !== null) {
            this.selectionUrl = this.changeUrl(this.selectionUrlTemplate!, replacers);
        }

        await this.loadSelections();
    }

    /** @inheritDoc */
    protected selectItem(item:Item) {
        // add element to selected item container
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
            button.classList.add('data-item-readonly-sensitive');
            button.classList.add('hidden-when-readonly');
            button.addEventListener('click', this.removeSelectedItemEvent.bind(this, item.identifier));
            button.innerHTML =  this.selectList.getAttribute('data-item-close-button-content') ?? '<span>X</span>';
            element.append(button)

            item.element = element;
            this.selectList.append(element)
        }

        super.selectItem(item);
    }

    /** @inheritDoc */
    protected deselectItem(item:Item) {
        // delete item element in selection container if it exists
        if (item.element !== null) {
            item.element.remove();
            item.element = null;
        }

        super.deselectItem(item);
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

    /**
     * Clears the current selection and reloads the table
     */
    public async clear(): Promise<void> {
        this.selectedItems = {};
        this.selectList!.innerHTML = '';
        await this.load(true)
    }
}