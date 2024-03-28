import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";

/** @protected {Element|null} expandButton The button responsible for expanding the body
 * @protected {Element|null} collapseButton The button responsible for collapsing the body
 *
 * @protected {number} searchTimer The number of milliseconds until a search should be attempted
 *
 * @property {string} currentLabel The label that is currently shown
 * @property {string} currentIdentifier The identifier of the item that is currently shown
 */

export class DataSelect extends AbstractDataproviderTemplate {
    protected expandButton: Element | null = null;
    protected collapseButton: Element | null = null;

    protected searchTimer: number = 0;

    /** @type {string} The default label that is shown when no option is selected */
    protected defaultLabel: string = '...';
    protected currentLabel: string = '';
    protected currentIdentifier: string = '';

    protected optionCls:string = '';
    protected optionContentCls:string = '';

    /** @inheritDoc */
    protected setup(): void {
        super.setup();
        this.history = false;
        this.showBodyDuringLoad = true;

        // expand/collapse buttons
        const expandButtonId = this.dataprovider.getAttribute('data-expand-button-id') ?? this.dataproviderID+'-expand-button';
        this.expandButton = document.querySelector('#' + expandButtonId);
        if (this.expandButton === null) {
            throw new Error('Expand button with id "#' + expandButtonId + '" not found on dataselector "#' + this.dataproviderID + '"')
        }

        this.expandButton.addEventListener('click', this.expandEvent.bind(this));

        const collapseButtonId = this.dataprovider.getAttribute('data-collapse-button-id') ?? this.dataproviderID+'-collapse-button';
        this.collapseButton = document.querySelector('#' + collapseButtonId);
        if (this.collapseButton === null) {
            throw new Error('Collapse button with id "#' + collapseButtonId + '" not found on dataselector "#' + this.dataproviderID + '"')
        }

        this.collapseButton.addEventListener('click', this.collapseEvent.bind(this));

        //check identifiers
        if (this.itemIdentifierKey === null) {
            throw new Error('Attribute "data-identifier-key" is missing on dataselector $"' + this.dataproviderID + '"')
        }

        this.defaultLabel = this.dataprovider.getAttribute('data-default-label') ?? '...';
        const searchbar = this.searchbar as HTMLInputElement;
        searchbar.value = this.defaultLabel;

        //set default hiding position
        this.body.classList.add('hidden');
        this.expandButton.classList.remove('hidden');
        this.collapseButton.classList.add('hidden');

        //set scroll events
        this.body.addEventListener('scrollend', this.scrollEvent.bind(this))

        //add cls
        this.optionCls = this.dataprovider.getAttribute('data-option-cls') ?? '';
        this.optionContentCls = this.dataprovider.getAttribute('data-option-content-cls') ?? '';
    }

    /** @inheritDoc */
    public async init(): Promise<void> {
        await super.init();
        this.body.classList.add('hidden');
    }

    /** @inheritDoc */
    protected initSearchbar(): void {
        super.initSearchbar();

        if (this.searchbarInput === null) {
            return;
        }

        this.searchbarInput.addEventListener('focus', this.expandEvent.bind(this))
        this.searchbarInput.addEventListener('blur', this.collapseEvent.bind(this))
        this.searchbarInput.addEventListener('input', this.searchbarKeystrokeEvent.bind(this))
    }

    /** @inheritDoc */
    protected async searchbarEvent(e: Event | null) {
        if (e instanceof KeyboardEvent) {
            if (e.key !== "Enter") {
                return;
            }
        }

        if (this.searchbarInput === null) {
            return;
        }

        this.searchterm = this.searchbarInput.value;
        await this.load(true);
    }

    /**
     * Starts a timer to start a search. Triggered on searchbar input
     * @return void
     */
    protected searchbarKeystrokeEvent() {
        clearTimeout(this.searchTimer)
        this.searchTimer = setTimeout(this.searchbarEvent.bind(this), 250)
    }

    /**
     * Triggered when an item is selected
     * @param {Element} item The selected item
     * @param {Event} event The click event
     * @return void
     */
    protected selectEvent(item: Element, event: Event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        this.currentLabel = item.textContent ?? this.currentLabel;
        this.currentIdentifier = item.getAttribute('data-value') ?? this.currentIdentifier;

        this.collapseEvent();
    }

    /**
     * Prevent click events being fire before click is complete
     * @param {Event} event The click event
     * @return void
     */
    protected preventMousedownEvent(event: Event) {
        event.preventDefault();
    }

    /**
     * Triggered when scrolling to the bottom. Loads more items.
     * @return void
     */
    protected async scrollEvent() {
        await this.load(false, true)
    }

    /**
     * Expands the dataselector's body
     * @return void
     */
    protected async expandEvent() {
        this.expandButton!.classList.add('hidden');
        this.collapseButton!.classList.remove('hidden');

        await this.load(true);
        this.body.classList.remove('hidden');

        if (this.searchbar !== null) {
            const searchbar = this.searchbar as HTMLInputElement;
            searchbar.focus();
        }
    }

    /**
     * Collapses the dataselector's body
     * @return void
     */
    protected collapseEvent() {
        this.expandButton!.classList.remove('hidden');
        this.collapseButton!.classList.add('hidden');
        this.body.classList.add('hidden');

        if (this.searchbarInput !== null) {
            this.searchbarInput.value = this.currentLabel;
            const dataprovider = this.dataprovider as HTMLInputElement;
            dataprovider.value = this.currentIdentifier;
        }
    }

    /** Gets the currently selection item's value */
    public getSelectedItem(): string {
        const dataselect = this.dataprovider as HTMLInputElement;
        return dataselect.value;
    }

    /** Resets the currently selected value to the default */
    public reset(): void {
        const searchbar = this.searchbar as HTMLInputElement;
        searchbar.value = this.defaultLabel;
        const dataprovider = this.dataprovider as HTMLInputElement;
        dataprovider.value = '';
    }

    /**
     * Creates a row to insert into the table
     * @param {Array} data Associative array to convert into a row
     * @return {HTMLTableRowElement} The created row
     */
    protected createItem(data: { [key: string]: any }): HTMLElement {
        const item = document.createElement('div');
        item.classList.value = this.optionCls;

        const content = document.createElement('a');
        content.classList.value = this.optionContentCls;
        content.setAttribute('data-value', data[this.itemIdentifierKey!])
        content.textContent = data[this.itemLabelKey!]
        item.append(content);

        item.addEventListener('mousedown', this.preventMousedownEvent.bind(this))
        item.addEventListener('click', this.selectEvent.bind(this, content))

        return item;
    }

    /** @inheritDoc */
    protected generateDataUrl(baseUrl: string = this.url): URL {
        const url = super.generateDataUrl(baseUrl);
        url.searchParams.set('offset', "" + this.body.children.length);

        return url;
    }
}
