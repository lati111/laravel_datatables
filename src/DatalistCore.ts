import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {DataOperationsModule} from "./Modules/DataOperationsModule";

export abstract class DatalistCore {
    //| Core properties

    /** The ID of this datalist, derived from the datalist element. */
    protected datalistID: string;

    /** The core element for this datalist. */
    protected datalistElement: Element;

    /** The body that should contain the contents for the datalist */
    protected datalistBody: Element;

    /** An array containing the urls for the datalist */
    public urls: {[key: string]: string} = {};

    /** An array containing the settings for the datalist */
    public settings: {[key: string]: string|number|boolean} = {
        "empty_body_string": "No results",
        "hide_body_during_loading": false,
        "history": true,
    }

    //| Event callbacks

    /** The event callback called before loading. The generated url is passed along and updated if returned. */
    public preLoadCallback: Function|null = null;

    /** The event callback called after loading. The loaded data is passed along and updated if returned. */
    public postLoadCallback: Function|null = null;

    /** The event callback called after making an item. The created item and the data its based on are passed along and updated if returned. */
    public itemCreationCallback: Function|null = null;

    /** The event callback for whenever an error occurs. */
    public onErrorCallback: Function|null = null;

    //| Modules

    /** The module handling data operations. */
    public dataModule = new DataOperationsModule();

    //| Setup

    /**
     * Sets up the datalist properly.
     * @param dataprovider The dataprovider element or the ID of that element.
     * @param body The body element or the ID of that element. If none are given, {dataproviderID}-body is assumed to be the ID.
     */
    public constructor(dataprovider: Element|string, body: Element|string|null = null) {
        // Setup dataprovider
        if (typeof dataprovider === 'string') {
            const dataproviderByID = document.querySelector('#'+dataprovider);
            if (dataproviderByID === null) {
                throw new DatalistConstructionError('No dataprovider found with the ID of '+dataprovider, this.onErrorCallback);
            }

            dataprovider = dataproviderByID;
        }

        this.datalistElement = dataprovider;
        if (this.datalistElement.id === "") {
            throw new DatalistConstructionError('No ID set on dataprovider', this.onErrorCallback);
        }

        this.datalistID = this.datalistElement.id;

        if (typeof body === 'string' || body === null) {
            const bodyByID = (body !== null) ? document.querySelector('#'+body) : document.querySelector('#'+this.datalistID+'-body');
            if (bodyByID === null) {
                throw new DatalistConstructionError('No body found on datalist with the ID of '+this.datalistID, this.onErrorCallback);
            }

            body = bodyByID;
        }

        this.datalistBody = body;

        // Setup dataprovider information
        this.urls['data'] = this.datalistElement.getAttribute('data-url') ?? '-';
        if (this.datalistElement.getAttribute('data-url') === '-') {
            throw new DatalistConstructionError('No `data-url` set on dataprovider '+dataprovider, this.onErrorCallback);
        }

        this.urls['pages'] = this.datalistElement.getAttribute('data-url-pages') ?? this.urls['data']+'/pages';
    }

    //| Data

    /**
     * Load data from the dataprovider and add it to the datalist.
     * Fires the pre-load callback before loading, and the post-load callback after loading.
     * @param shouldResetPagination Should the pagination be reset to 1 for this loading?
     * @param keepContents Keep the contents of the datalist body instead of removing it.
     */
    public async dataLoad(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        let url = this.urls['data'];

        // Pre load callback
        if (this.preLoadCallback !== null) {
            const updatedUrl = this.preLoadCallback(this, url);
            if (updatedUrl !== null) {
                url = updatedUrl;
            }
        }

        // Load the data
        let data = await this.dataModule.getData(this.urls['data']);

        // Post load callback
        if (this.postLoadCallback !== null) {
            const updatedData = this.postLoadCallback(this);
            if (updatedData !== null) {
                data = updatedData;
            }
        }

        // Display the items
        let empty = true;
        let key: keyof typeof data;
        for (key in data) {
            this.addItem(data[key]);
            empty = false;
        }

        if (empty && !keepContents) {
            this.datalistBody.innerHTML = (this.settings['empty_body_string'] as string);
        }
    }

    //| Body manipulation

    /**
     * Adds a new item to the body.
     * Fires the item creation callback.
     * @param data The data array to base the new item on.
     */
    public addItem(data:{[key:string]:any}): void {
        let item = this.createItem(data);

        if (this.itemCreationCallback !== null) {
            const newItem = this.itemCreationCallback(this, item, data);
            if (newItem instanceof HTMLElement) {
                item = newItem;
            }
        }

        this.datalistBody.append(item);
    }

    /**
     * Create a new item to be added to the body.
     * @param data The data array to base the new item on.
     * @protected
     */
    protected abstract createItem(data:{[key:string]:any}): HTMLElement;

    //| Getters

    /**
     * Get the core datalist element of a datalist.
     */
    public getDatalistElement(): Element {
        return this.datalistElement;
    }
}