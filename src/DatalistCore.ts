import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {DataOperationsModule} from "./Modules/DataOperationsModule";
import {CoreSettings} from "./Settings/CoreSettings";

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
    public settings: CoreSettings = new CoreSettings();

    //| Components

    /** The searchbar element */
    protected searchbarElement: HTMLInputElement|undefined;

    /** The last searchbar value */
    protected searchValue: string = '';

    /** The pagination element */
    protected paginationElement: HTMLElement|null = null;

    /** The current page. */
    public page: number = 1;

    /** The maximum amount of pages */
    protected maxPages: number = 0;

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
    protected constructor(dataprovider: Element|string, body: Element|string|null = null, paginationElement: HTMLElement|null = null) {
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

        // Setup pagination
        if (paginationElement !== null) {
            this.paginationElement = paginationElement;
        } else {
            const div = document.createElement('div');
            div.id = 'datalist-pagination';
            this.datalistElement.append(div)

            this.paginationElement = div;
        }

        this.initializePaginationElement();
    }

    public async init() {
        await this.dataLoad();
    }

    //| Data

    /**
     * Load data from the dataprovider and add it to the datalist.
     * Fires the pre-load callback before loading, and the post-load callback after loading.
     * @param shouldResetPagination Should the pagination be reset to 1 for this loading?
     * @param keepContents Keep the contents of the datalist body instead of removing it.
     */
    public async dataLoad(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        this.datalistBody.setAttribute('disabled', 'disabled');

        // Hide the body if `hide body during loading` setting is enabled
        if (this.settings.hide_body_during_loading) {
            this.datalistBody.classList.add('hidden');
        }

        // Load the data
        let data = await this.dataModule.getData(this.generateDataUrl());

        // Post load callback
        if (this.postLoadCallback !== null) {
            const updatedData = this.postLoadCallback(this);
            if (updatedData !== null) {
                data = updatedData;
            }
        }

        // Empty the body unless told otherwise
        if (!keepContents) {
            this.datalistBody.innerHTML = '';
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

        // Show the body again if `hide body during loading` setting is enabled
        if (this.settings.hide_body_during_loading) {
            this.datalistBody.classList.remove('hidden');
        }

        // Setup pagination
        await this.drawPagination(this.dataModule, this.generateDataUrl(), this.settings.paginationSize)

        this.datalistBody.removeAttribute('disabled');
    }

    protected generateDataUrl() {
        let url = this.urls['data'];

        // Pre load callback
        if (this.preLoadCallback !== null) {
            const updatedUrl = this.preLoadCallback(this, url);
            if (updatedUrl !== null) {
                url = updatedUrl;
            }
        }

        return url;
    }

    protected applyParametersToUrl(baseUrl: string) {
        let url = new URL(baseUrl);

        if (this.searchValue !== '') {
            url.searchParams.set('search', this.searchValue)
        }

        url.searchParams.set('page', String(this.page))
        url.searchParams.set('per_page', String(this.settings.itemsPerPage))

        return url;
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

    //| Components

    // Search

    public enableSearchBar(searchbarElement: HTMLInputElement, confirmButton: HTMLButtonElement|undefined = undefined) {
        this.searchbarElement = searchbarElement;
        this.searchbarElement.addEventListener('keypress', this.searchbarEvent.bind(this))

        if (confirmButton !== undefined) {
            confirmButton.addEventListener('click', this.search.bind(this))
        }
    }

    public async search() {
        if (this.searchbarElement === undefined) {
            return;
        }

        if (this.searchValue === this.searchbarElement.value) {
            return;
        }

        this.searchValue = this.searchbarElement.value;

        await this.dataLoad(true, false)
    }

    protected async searchbarEvent(e:Event) {
        if (e instanceof KeyboardEvent) {
            if (e.key !== "Enter") {
                return;
            }
        }

        await this.search();
    }

    // Pagination

    protected initializePaginationElement() {
        const leftMostNavigator = document.createElement('button');
        leftMostNavigator.id = 'leftmost_navigator';
        leftMostNavigator.addEventListener('click', this.paginateTo.bind(this, 1, false));
        leftMostNavigator.classList.add('pagination-node');
        leftMostNavigator.textContent = '<<';

        const leftNavigator = document.createElement('button');
        leftNavigator.id = 'left_navigator';
        leftNavigator.addEventListener('click', this.paginateTo.bind(this, -1, true));
        leftNavigator.classList.add('pagination-node');
        leftNavigator.textContent = '<';


        const innerPaginationContainer = document.createElement('span');
        innerPaginationContainer.id = 'datalist-pagination-pages'


        const rightNavigator = document.createElement('button');
        rightNavigator.id = 'right_navigator';
        rightNavigator.addEventListener('click', this.paginateTo.bind(this, 1, true));
        rightNavigator.classList.add('pagination-node');
        rightNavigator.textContent = '>';

        const rightMostNavigator = document.createElement('button');
        rightMostNavigator.id = 'rightmost_navigator';
        rightMostNavigator.addEventListener('click', this.paginateTo.bind(this, -99, false));
        rightMostNavigator.classList.add('pagination-node');
        rightMostNavigator.textContent = '>>';

        this.paginationElement?.prepend(leftNavigator)
        this.paginationElement?.prepend(leftMostNavigator);
        this.paginationElement?.append(innerPaginationContainer);
        this.paginationElement?.append(rightNavigator);
        this.paginationElement?.append(rightMostNavigator);
    }

    protected async drawPagination(dataModule: DataOperationsModule, url: string, paginationSize: number): Promise<any> {
        this.maxPages = await dataModule.getData(this.urls['pages']);
        const innerContainer = this.paginationElement?.querySelector('#datalist-pagination-pages') as HTMLElement;
        innerContainer.innerHTML = '';

        // Set navigator button status
        if (this.page === 1) {
            this.paginationElement?.querySelector('#leftmost_navigator')?.setAttribute('disabled', 'disabled');
            this.paginationElement?.querySelector('#left_navigator')?.setAttribute('disabled', 'disabled');
        } else {
            this.paginationElement?.querySelector('#leftmost_navigator')?.removeAttribute('disabled');
            this.paginationElement?.querySelector('#left_navigator')?.removeAttribute('disabled');
        }

        if (this.page === this.maxPages) {
            this.paginationElement?.querySelector('#rightmost_navigator')?.setAttribute('disabled', 'disabled');
            this.paginationElement?.querySelector('#right_navigator')?.setAttribute('disabled', 'disabled');
        } else {
            this.paginationElement?.querySelector('#rightmost_navigator')?.removeAttribute('disabled');
            this.paginationElement?.querySelector('#right_navigator')?.removeAttribute('disabled');
        }

        innerContainer.append(this.drawPaginationNode(this.page, true));

        for (let i = 1; i <= paginationSize; i++) {
            if (this.page - i >= 1) {
                innerContainer.prepend(this.drawPaginationNode(this.page - i));
            } else {
                const padding = document.createElement('span');
                padding.classList.add('pagination-node');
                innerContainer.prepend(padding);
            }

            if (this.page + i <= this.maxPages) {
                innerContainer.append(this.drawPaginationNode(this.page + i));
            } else {
                const padding = document.createElement('span');
                padding.classList.add('pagination-node');
                innerContainer.append(padding);
            }
        }
    }

    protected drawPaginationNode(page: number, currentPage: boolean = false) {
        const button = document.createElement('button');
        button.addEventListener('click', this.paginateTo.bind(this, page, false));
        button.classList.add('pagination-node');
        button.textContent = page.toString();

        if (currentPage) {
            button.classList.add('active');
        }

        return button
    }

    public async paginateTo(page: number, addMode: boolean = false) {
        if (page === -99) {
            page = this.maxPages;
        }

        if (addMode) {
            this.page = this.page + page;
        } else {
            this.page = page;
        }

        await this.dataLoad();
    }

    //| Getters

    /**
     * Get the overarching container element.
     * This is the container if one is set, and the datalist element otherwise.
     */
    public getOverarchingContainer(): Element {
        return this.datalistElement;
    }

    /**
     * Get the core datalist element of a datalist.
     */
    public getDatalistElement(): Element {
        return this.datalistElement;
    }
}