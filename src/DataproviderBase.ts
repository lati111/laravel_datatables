import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {DatalistError} from "./Exceptions/DatalistError";

/**
 * @property {Element} dataprovider The main element of the data provider
 * @property {string} dataproviderID The ID of the dataprovider
 * @property {string} url The data url set by the dataprovider
 * @property {string} urlTemplate The template url for when dynamicUrl is enabled
 * @property {boolean} loading Whether this dataprovider is currently loading
 *
 * @property {boolean} history Determines if this dataprovider should save it's history
 * @property {boolean} dynamicUrl Determines if the url's may be changed
 * @property {boolean} blockLoading If true prevents from loading data
 * @property {boolean} showBodyDuringLoad Whether to keep the body visible while loading if a spinner is present.
 *
 * @property {Element} body The element content should be placed in
 * @property {string} emptyBody The text that should be displayed when body is empty
 * @property {Element|null} spinner The spinner element to be shown when loading
 *
 * @property {Element|null} pagination The main pagination element
 * @property {Element|null} paginationContent The element pagination content should be placed in
 * @property {HTMLSelectElement|null} perpageSelector The per page selector element
 * @property {HTMLButtonElement|null} prevBtn The button to be clicked to go 1 page backwards
 * @property {HTMLButtonElement|null} nextBtn The button to be clicked to go 1 page forwards
 * @property {string|null} pagecountUrl The url to retrieve the page count from
 * @property {string|null} pagecountUrlTemplate The templated url to retrieve the page count from when dynamic urls are enabled
 * @property {number|null} perpage The amount of items per page
 * @property {number|null} pages The amount of pages
 * @property {number|null} page The current page
 * @property {number|null} pagesInPagination The amount of page buttons in the pagination (this amount to the left and right current page in the middle
 * @property {string|null} pageBtnCls The classes to be added to all pagination elements
 * @property {string|null} pageNumberedBtnCls The classes to be added to be added to page buttons
 * @property {string|null} pageBtnDividerCls The classes to be added to the pagination dividers
 * @property {string|null} pageEmptyBtnCls The classes to be added to the empty page buttons
 *
 * @property {Element|null} searchbar The main searchbar element
 * @property {HTMLInputElement|null} searchbarInput The actual input of the searchbar
 * @property {HTMLButtonElement|null} searchbarConfirmButton The confirmation button of the searchbar
 * @property {string|null} searchterm The term to be searched for
 */

export abstract class DataproviderBase {
    //| Core properties
    public dataprovider: Element
    protected readonly dataproviderID: string;
    public url: string;
    public urlTemplate: string;
    protected errorCallback: Function|null;

    //| Dataprovider settings
    protected history: boolean = true;
    protected dynamicUrl: boolean = true;
    protected blockLoading: boolean = false;
    protected showBodyDuringLoad: boolean = true;
    /** @type {boolean} Whether or not this dataprovider is readonly */
    protected readonly: boolean = false;
    protected loading: boolean = false;

    //| Body properties
    protected body: Element;
    protected emptyBody = '';
    protected spinner: Element | null = null;
    /** @type {Element|null} The container to disable on load. When not set nothing will be disabled */
    protected disableContainer: Element | null = null;

    //| Data item properties
    /** @type {string|null} The key of the value in the data used to identify an item. When null all items are treated as generic */
    protected itemIdentifierKey: string|null = null;
    /** @type {string|null} The key of the value in the data used to display the item. When null the identifier is used as the label */
    protected itemLabelKey: string|null = null;
    /** @type {string|null} The key of the value in the data used to decide whether an item is active or not */
    protected itemActivityKey: string|null = null;
    /** @type {string} The identifier used for a new item that has not yet received a true id */
    protected newItemIdentifier: string = 'new_data_item';
    /** @type {Array} An associative array mimicking the format of the actual data given. This is used instead of normal parameters in creating a new item */
    public newItemData:{[key:string]: any} = {};

    //| Pagination properties
    protected pagination: Element | null = null;
    protected paginationContent: Element | null = null;
    protected perpageSelector: HTMLSelectElement | null = null;
    protected prevBtn: HTMLButtonElement | null = null;
    protected nextBtn: HTMLButtonElement | null = null;
    protected pagecountUrl: string | null = null;
    protected pagecountUrlTemplate: string | null = null;
    protected perpage: number | null = null;
    protected pages: number | null = null;
    protected page: number | null = null;
    protected pagesInPagination: number = 7;
    protected pageBtnCls: string | null = null;
    protected pageNumberedBtnCls: string | null = null;
    protected pageBtnDividerCls: string | null = null;
    protected pageEmptyBtnCls: string | null = null;

    //| Search properties
    protected searchbar: Element | null = null;
    protected searchbarInput: HTMLInputElement | null = null;
    protected searchbarConfirmButton: HTMLButtonElement | null = null;
    protected searchterm: string | null = null;

    //| Event callbacks
    /** @type {Function|null} An event triggered when an item is created. Passes the dataprovider and the item as parameters. If the item is returned in the callback, the new item will be used */
    public onItemCreateEvent: Function|null = null;
    /** @type {Function|null} An event triggered when an inactive item is set as active. Passes the dataprovider and the item as parameters. */
    public onItemEnableEvent: Function|null = null;
    /** @type {Function|null} An event triggered when an actuve item is toggled as inactive. Passes the dataprovider and the item as parameters. */
    public onItemDisableEvent: Function|null = null;

    public constructor(dataprovider: Element | string, errorCallback: Function|null = null) {
        this.errorCallback = errorCallback;

        if (typeof dataprovider === 'string') {
            dataprovider = document.querySelector('#' + dataprovider + '.dataprovider')!;
        }

        this.dataprovider = dataprovider;
        this.dataproviderID = dataprovider.id;

        const dataUrl = this.dataprovider.getAttribute('data-content-url');
        if (dataUrl === null) {
            throw new DatalistConstructionError('Could not find attribute data-content-url on dataprovider with ID ' + dataUrl, this.errorCallback);
        }

        const history = this.dataprovider.getAttribute('data-history');
        if (history === 'false') {
            this.history = false;
        }

        this.url = dataUrl;
        this.urlTemplate = dataUrl;
        this.body = this.dataprovider
    }

    //| Inits

    /**
     * Initializes the dataprovider and loads the first set of data
     * @return void
     */
    public async init(): Promise<void> {
        this.setup();

        if (this.history === true) {
            await this.loadFromUrlStorage();
            window.addEventListener("popstate", this.loadFromUrlStorage.bind(this));
        } else {
            await this.load();
        }
    }

    /**
     * Initializes all elements and event listeners
     * @return void
     */
    protected setup(): void {
        this.initBody();
        this.initItemParameters();
        this.initSpinner();

        if (this.dataprovider.getAttribute('data-dynamic-url') === 'true') {
            this.dynamicUrl = true;
            this.blockLoading = true;
        }

        this.initPagination();
        this.initSearchbar();
        this.initFilters();
    }

    /**
     * Initialize the content body elements
     * @return void
     */
    protected initBody() {
        let contentID = this.dataprovider.getAttribute('data-content-ID');
        if (contentID === null) {
            contentID = this.dataproviderID + '-content';
        }

        this.emptyBody = this.dataprovider.getAttribute('data-empty-body') ?? '';

        const contentElement = document.querySelector('#' + contentID)
        if (contentElement === null) {
            throw new DatalistConstructionError('Could not find content on dataprovider with ID ' + contentID, this.errorCallback);
        }
        this.body = contentElement;

        let disableContainerId = this.dataprovider.getAttribute('data-disable-container-ID') ?? this.dataproviderID + '-disable-container';
        this.disableContainer = document.querySelector('#' + disableContainerId)
    }

    /**
     * Initialize the data item parameters
     * @return void
     */
    protected initItemParameters() {
        this.itemIdentifierKey = this.dataprovider.getAttribute('data-identifier-key');
        this.itemLabelKey = this.dataprovider.getAttribute('data-label-key') ?? this.itemIdentifierKey;
        this.itemActivityKey = this.dataprovider.getAttribute('data-activity-key');
        this.newItemIdentifier = this.dataprovider.getAttribute('data-new-item-identifier') ?? 'new_data_item';
    }

    /**
     * Initialize the spinner element if it exists
     * @return void
     */
    protected initSpinner() {
        let spinnerID = this.dataprovider.getAttribute('data-spinner-ID');
        if (spinnerID === null) {
            spinnerID = this.dataproviderID + '-spinner';
        }

        const spinnerElement = document.querySelector('#' + spinnerID + '.spinner')
        if (spinnerElement !== null) {
            this.spinner = spinnerElement;
            this.showBodyDuringLoad = spinnerElement.getAttribute('data-hide-body') === 'false';
        }
    }

    /**
     * Initialize the searchbar elements and apply event listeners
     * @return void
     */
    protected initPagination() {
        let paginationID = this.dataprovider.getAttribute('data-pagination-ID');
        if (paginationID === null) {
            paginationID = this.dataproviderID + '-pagination';
        }

        const paginationElement = document.querySelector('#' + paginationID + '.pagination')
        if (paginationElement === null) {
            return;
        }

        const url = paginationElement.getAttribute('data-count-url');
        if (url === null) {
            throw new DatalistConstructionError('Pagination with ID "'+paginationID+'" is missing attribute "data-count-url"', this.errorCallback)
        }

        this.pagination = paginationElement;
        this.pagecountUrl = url;
        this.pagecountUrlTemplate = url;

        //content init
        const contentID = paginationElement.getAttribute('data-content-ID')
        if (contentID !== undefined) {
            const contentElement = document.querySelector('#'+contentID);
            if (contentElement !== null) {
                this.paginationContent = contentElement
            }
        }

        //previous page button init
        const prevBtnID = paginationElement.getAttribute('data-previous-page-button-ID')
        if (prevBtnID !== undefined) {
            const prevBtn = document.querySelector('#'+prevBtnID) as HTMLButtonElement|null;
            if (prevBtn !== null) {
                prevBtn.addEventListener('click', this.pageChangeEvent.bind(this))
                this.prevBtn = prevBtn
            }
        }

        //next page button init
        const nextBtnID = paginationElement.getAttribute('data-next-page-button-ID')
        if (nextBtnID !== undefined) {
            const nextBtn = document.querySelector('#'+nextBtnID) as HTMLButtonElement|null;
            if (nextBtn !== null) {
                nextBtn.addEventListener('click', this.pageChangeEvent.bind(this))
                this.nextBtn = nextBtn
            }
        }

        //per page selector init
        const perpageSelectorID = paginationElement.getAttribute('data-perpage-selector-ID')
        if (perpageSelectorID !== undefined) {
            const perpageSelector = document.querySelector('#'+perpageSelectorID) as HTMLSelectElement|null;
            if (perpageSelector !== null) {
                perpageSelector.addEventListener('change', this.perPageChangeEvent.bind(this))
                this.perpageSelector = perpageSelector

                if (this.perpageSelector.value !== null) {
                    this.perpage = parseInt(perpageSelector.value);
                }
            }
        }

        //page button cls
        this.pageBtnCls = paginationElement.getAttribute('data-page-cls')
        this.pageNumberedBtnCls = paginationElement.getAttribute('data-page-number-cls')
        this.pageBtnDividerCls = paginationElement.getAttribute('data-page-divider-cls')
        this.pageEmptyBtnCls = paginationElement.getAttribute('data-page-empty-cls')
        if (paginationElement.getAttribute('data-pages-in-pagination') !== null) {
            this.pagesInPagination = parseInt(paginationElement.getAttribute('data-pages-in-pagination')!)
        }

    }

    /**
     * Initialize the searchbar elements and apply event listeners
     * @return void
     */
    protected initSearchbar() {
        let searchbarID = this.dataprovider.getAttribute('data-searchbar-ID');
        if (searchbarID === null) {
            searchbarID = this.dataproviderID + '-searchbar';
        }

        const searchbarElement = document.querySelector('#' + searchbarID + '.searchbar')
        if (searchbarElement === null) {
            return;
        }

        this.searchbar = searchbarElement;
        const loadFunc = this.searchbarEvent.bind(this);

        //confirm button init
        const searchBtnID = searchbarElement.getAttribute('data-confirm-button-ID') ?? this.dataproviderID + '-search-confirm-button'
        const searchBtnElement = document.querySelector('#'+searchBtnID) as HTMLButtonElement|null;
        if (searchBtnElement !== null) {
            searchBtnElement.addEventListener('click', loadFunc)
            this.searchbarConfirmButton = searchBtnElement
        }

        //input init
        const searchInputID = searchbarElement.getAttribute('data-input-ID')
        if (searchBtnID !== undefined) {
            let searchInputElement = document.querySelector('#'+searchInputID) as HTMLInputElement|null;
            if (searchInputElement === null) {
                searchInputElement = this.searchbar as HTMLInputElement;
            }

            searchInputElement.addEventListener('keypress', loadFunc)
            this.searchbarInput = searchInputElement
        }
    }

    /**
     * Initialize the filter checkboxes (all checkboxes marked with the {dataproviderID}-filter-list class)
     * @return void
     */
    protected initFilters() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox') as NodeListOf<HTMLInputElement>
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = checkboxes[i];
            checkbox.addEventListener('change', this.load.bind(this, true, false))
        }
    }

    //| Events

    /**
     * Fired when the pagination is triggered, opening the selected page
     * @param {Event} e The triggering event
     * @return void
     */
    protected async pageChangeEvent(e:Event) {
        if (this.pagination === null || this.page === null || this.pages === null) {
            return;
        }

        const element = e.target as Element;
        let pageChanged = false;

        if (element === this.prevBtn && this.page > 1) {
            this.page -= 1;
            pageChanged = true;
        }


        if (element === this.nextBtn && this.page < this.pages) {
            this.page += 1;
            pageChanged = true;
        }


        const page = element.getAttribute('data-value');
        if (page !== null) {
            this.page = parseInt(page);
            pageChanged = true;
        }

        if (pageChanged) {
            await this.load()
        }
    }

    /**
     * Fired when the per page selector is triggered, setting the per page value
     * @return void
     */
    protected async perPageChangeEvent() {
        if (this.pagination === null || this.perpageSelector === null) {
            return;
        }

        this.perpage = parseInt(this.perpageSelector.value);

        await this.load()
    }

    /**
     * Fired when the searchbar is triggered, setting the new search parameters
     * @param {Event} e The triggering event
     * @return void
     */
    protected async searchbarEvent(e:Event) {
        if (e instanceof KeyboardEvent) {
            if (e.key !== "Enter") {
                return;
            }
        }

        if (this.searchbarInput === null || this.loading) {
            return;
        }

        this.searchterm = this.searchbarInput.value;
        await this.load(true);
    }

    /**
     * An event that toggles the activity of an item in the datalist based on the passed checkbox. Triggered by a checkbox that uses the itemActivityKey as it's name.
     * @return void
     */
    protected toggleItemActivityEvent(element:HTMLInputElement) {
        const dataItem = element.closest('.data-item');
        if (dataItem === null) {
            throw new DatalistError('Data item not found on activity toggle', this.errorCallback);
        }

        if (element.checked) {
            this.removeReadonlyMode(dataItem);
        } else {
            this.applyReadonlyMode(dataItem);
        }
    }

    //| Setup

    /**
     * Fills the pagination with the right elements
     * @return void
     */
    protected async fillPagination() {
        if (this.pagecountUrl === null || this.paginationContent === null) {
            return;
        }

        if (this.page === null) {
            this.page = 1;
        }

        const url = this.generateDataUrl(this.pagecountUrl).toString()

        const pages = await this.fetchData(url) as number;
        this.paginationContent.innerHTML = '';
        this.pages = pages;

        // show previous button
        if (this.prevBtn !== null) {
            if (this.prevBtn.hasAttribute('disabled') && this.page !== 1) {
                this.prevBtn.removeAttribute('disabled')
            } else if (this.page === 1) {
                this.prevBtn.setAttribute('disabled', 'disabled')
            }
        }

        if (this.page > this.pagesInPagination + 1) { // show skip to first page
            this.paginationContent.append(this.createPaginationNode('1', 1))
            this.paginationContent.append(this.createPaginationDivider());
        } else { // show 2 more pages left
            for(let i = this.page - this.pagesInPagination; i < this.page - (this.pagesInPagination - 2); i++) {
                if (i > 0) {
                    this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                } else {
                    this.paginationContent.append(this.createEmptyPaginationNode());
                }
            }
        }

        // show pages left of current page
        for(let i = this.page - (this.pagesInPagination - 2); i < this.page; i++) {
            if (i > 0) {
                this.paginationContent.append(this.createPaginationNode(i.toString(), i))
            } else {
                this.paginationContent.append(this.createEmptyPaginationNode());
            }
        }

        // show current page
        this.paginationContent.append(this.createPaginationNode(this.page.toString(), this.page, true))

        // show pages right of current page
        for(let i = this.page + 1; i < this.page + (this.pagesInPagination - 1); i++) {
            if (i <= pages) {
                this.paginationContent.append(this.createPaginationNode(i.toString(), i))
            } else {
                this.paginationContent.append(this.createEmptyPaginationNode());
            }
        }

        if (this.page < pages - this.pagesInPagination) { // show skip to final pages
            this.paginationContent.append(this.createPaginationDivider());
            this.paginationContent.append(this.createPaginationNode(pages.toString(), pages))
        } else { // show right 2 numbers
            for(let i = pages - 1; i < pages + 1; i++) {
                if (i < pages - 2 && i > this.page) {
                    this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                } else {
                    this.paginationContent.append(this.createEmptyPaginationNode());
                }
            }
        }

        // show next button
        if (this.nextBtn !== null) {
            if (this.nextBtn.hasAttribute('disabled') && this.page !== pages) {
                this.nextBtn.removeAttribute('disabled')
            } else if (this.page === pages) {
                this.nextBtn.setAttribute('disabled', 'disabled')
            }
        }
    }

    /**
     * Generates a clickable pagination button for the given page
     * @param {string} text The display text of the page button
     * @param {number} page What page this button leads to when clicked
     * @param {boolean} current If this is the currently opened page. False by default
     * @return {HTMLButtonElement} Returns the generated element
     */
    protected createPaginationNode(text:string, page:number, current:boolean = false): HTMLButtonElement {
        const element = document.createElement('button');
        element.classList.value = this.pageBtnCls + ' ' + this.pageNumberedBtnCls;
        element.setAttribute('data-value', page.toString());
        element.textContent = text;
        if (current) {
            element.classList.add('active');
        }

        element.addEventListener('click', this.pageChangeEvent.bind(this))
        return element;
    }

    /**
     * Generated the divider seperating the first/last page from the range of pages near the current page
     * @return {HTMLSpanElement} Returns the generated element
     */
    protected createPaginationDivider():HTMLSpanElement {
        const element = document.createElement('span');
        element.classList.value = this.pageBtnCls + ' ' + this.pageBtnDividerCls;
        element.textContent = '...';
        return element;
    }

    /**
     * Generates a placeholder element to use when a page does not exist on that location to maintain spacing
     * @return {HTMLButtonElement} Returns the generated element
     */
    protected createEmptyPaginationNode():HTMLButtonElement {
        const element = document.createElement('button');
        element.classList.value = this.pageBtnCls + ' ' + this.pageEmptyBtnCls;
        return element;
    }

    //| Data operations

    /**
     * Generates a request url with the query parameters applied
     * @param {string} baseUrl The url before any query parameters are applied
     * @return {URL} Returns the generated URL
     */
    protected generateDataUrl(baseUrl:string = this.url):URL {
        const url = new URL(baseUrl);

        if (this.pagination !== null) {
            url.searchParams.set('page', (this.page ?? 1).toString());
            url.searchParams.set('perpage', (this.perpage ?? 10).toString());
        }

        if (this.searchbar !== null && this.searchterm !== null  && this.searchterm !== '') {
            url.searchParams.set('search', this.searchterm);
        }

        const filters = this.getFilters();
        if (filters.length > 0) {
            url.searchParams.set('filters', JSON.stringify(filters));
        }

        return url;
    }

    /**
     * Modifies the urls of this dataprovider and resets it
     * @param {array} replacers Associative array filled with replacers
     * @return void
     */
    public async modifyUrl(replacers:{[key:string]:string}) {
        this.blockLoading = false;
        await this.changeUrls(replacers);

        await this.load(true);
    }

    /**
     * Changes all the urls on record for this dataprovider
     * @param {array} replacers Associative array filled with replacers
     * @return void
     */
    protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
        this.url = this.changeUrl(this.urlTemplate, replacers);
        if (this.pagecountUrl !== null) {
            this.pagecountUrl = this.changeUrl(this.pagecountUrlTemplate!, replacers);
        }
    }

    /**
     * Changes the given url according to the given replacers
     * @param {string} url The url that should be changed
     * @param {array} replacers Associative array filled with replacers
     * @return string The changed url
     */
    protected changeUrl(url:string, replacers:{[key:string]:string}): string {
        let key: keyof typeof replacers;
        for (key in replacers) {
            url = url.replace(key, replacers[key])
        }

        return url;
    }

    /**
     * Loads data from the dataprovider with the selected query parameters applied.
     * @param {boolean} shouldResetPagination Whether the page should be set to 1, false by default.
     * @param {boolean} keepContents Whether the content should be kept instead of deleted. False by default.
     * @return void
     */
    public async load(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        if (this.blockLoading || this.loading) {
            return;
        }

        this.loading = true;

        // show the spinner if it is enabled
        if (this.spinner !== null) {
            this.spinner.classList.remove('hidden');
        }

        // disable the container if on exists
        if (this.disableContainer !== null) {
            this.disableContainer.setAttribute('disabled', 'disabled');
        }

        // hide the body if needed
        if (!this.showBodyDuringLoad) {
            this.body.classList.add('hidden');
        }

        // clear contents
        if (!keepContents) {
            this.body.innerHTML = '';
        }

        if (this.pagination !== null && shouldResetPagination) {
            this.page = 1;
        }

        // get the data
        const url = this.generateDataUrl();
        const data = await this.fetchData(url.toString())

        // save the data
        let empty = true;
        let key: keyof typeof data;
        for (key in data) {
            this.addItem(data[key]);
            empty = false;
        }

        if (empty && !keepContents) {
            this.body.innerHTML = this.emptyBody;
        }

        // hide the spinner if it is enabled
        if (this.spinner !== null) {
            this.spinner.classList.add('hidden');
        }

        // show the body again if it was hidden
        if (!this.showBodyDuringLoad) {
            this.body.classList.remove('hidden');
        }

        // enable the container if it exists
        if (this.disableContainer !== null) {
            this.disableContainer.removeAttribute('disabled');
        }

        // refill the pagination
        await this.fillPagination()

        // save data history
        if (this.history === true) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set(this.dataproviderID, JSON.stringify(this.getStorableData()))
            window.history.pushState({urlPath:currentUrl.toString()}, '', currentUrl.toString());
        }

        this.loading = false;

        // remarks as readonly if needed
        if (this.readonly) {
            this.applyReadonlyMode();
        }
    }

    /**
     * Gets the dataprovider data from the provided url through an ajax request
     * @param {string} url The url to retrieve data from
     * @return {any} Returns the data from the url
     */
    abstract fetchData(url: string): any;

    /**
     * Sends the given parameters to the given request
     * @param {string} url The url to send data to
     * @param parameters The parameters to send along
     * @return {any} Returns the data from the url
     */
    abstract postData(url:string, parameters: FormData): any;

    /**
     * Gets an associative array containing the data of the current dataprovider state
     * @return {Object} Returns an associative array with the data
     */
    protected getStorableData():{[key: string]: any} {
        const data:{[key: string]: any} = {};

        if (this.pagination !== null) {
            data.page = this.page ?? 1;
            data.perpage = this.perpage ?? 10;
        }

        if (this.searchbar !== null) {
            if (this.searchterm !== null) {
                data.searchterm = this.searchterm;
            }
        }

        const filters = this.getFilters();
        if (filters.length > 0) {
            data.filters = filters;
        }

        return data;
    }

    /**
     * Gets the stored data from the URL and loads in those parameters
     * @return void
     */
    public async loadFromUrlStorage():Promise<void> {
        const url = new URL(window.location.href);
        if (url.searchParams.get(this.dataproviderID) === null) {
            await this.load();
            return;
        }

        const data = JSON.parse(url.searchParams.get(this.dataproviderID)!);
        this.loadDataFromStorage(data);

        await this.load();
    }

    /**
     * Loads data from a storage json into the current dataprovider
     * @param {array} data Associative array containing the data
     * @return void
     */
    protected loadDataFromStorage(data:{[key:string]: any}):void {
        if (this.pagination !== null) {
            if (data.page !== undefined) {
                this.page = data.page;
            }

            if (data.perpage !== undefined) {
                this.perpage = data.perpage;
                if (this.perpageSelector !== null) {
                    this.perpageSelector.value = data.perpage;
                }
            }
        }

        if (this.searchbar !== null) {
            if (data.searchterm !== undefined) {
                this.searchbarInput!.value = data.searchterm
                this.searchterm = data.searchterm;
            }
        }

        if (typeof data.filters === 'object') {
            for (const key in data.filters) {
                const filter = data.filters[key];
                const filterCheckbox = document.querySelector('input[type="checkbox"][name="'+filter['filter']+'"].'+this.dataproviderID+'-filter-checkbox') as HTMLInputElement|null;
                if (filterCheckbox === null) {
                    continue;
                }

                if (filterCheckbox.getAttribute('data-checked-operator') === filter['operator']) {
                    if (Object.hasOwn(filter, 'value') && filterCheckbox.getAttribute('data-checked-value') !== filter['value']) {
                        continue;
                    }

                    filterCheckbox.checked = true;
                }
            }
        }
    }

    //| DOM manipulation

    /**
     * Check all filter elements and combine the results into an array
     * @return void
     */
    protected getFilters(): {'filter':string, 'operator'?:string, 'value'?:string}[] {
        const filters: {'filter':string, 'operator'?:string, 'value'?:string}[] = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"].'+this.dataproviderID+'-filter-checkbox') as NodeListOf<HTMLInputElement>
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = checkboxes[i];
            const filter: {'filter':string, 'operator'?:string, 'value'?:string} = {
                'filter': checkbox.name
            };

            if (checkbox.checked) {
                filter.operator = checkbox.getAttribute('data-checked-operator') ?? undefined;
                filter.value = checkbox.getAttribute('data-checked-value') ?? undefined;
            } else {
                filter.operator = checkbox.getAttribute('data-unchecked-operator') ?? undefined;
                filter.value = checkbox.getAttribute('data-unchecked-value') ?? undefined;
            }

            if (filter.operator !== undefined && filter.operator !== null) {
                filters.push(filter);
            }
        }

        return filters;
    }

    /**
     * Sets the datalist to readonly mode. This adds the 'datalist-readonly' class to the datalist, and marks all elements with the 'data-item-readonly-sensitive' not already marked as readonly as readonly, or disabled depending on the type.
     */
    public enableReadonlyMode(): void {
        this.readonly = true;
        this.applyReadonlyMode();
    }

    /**
     * Removes the effects of readonly mode.
     */
    public disableReadonlyMode(): void {
        this.readonly = false;
        this.removeReadonlyMode();
    }

    /**
     * Applies the readonly properties to the dataprovider. This adds the 'datalist-readonly' class to the datalist.
     * It also marks all elements with the 'data-item-readonly-sensitive' as readonly, or disabled depending on the type.
     * This ignores elements already marked as readonly. New readonly elements have the class 'data-item-readonly'.
     * Lastly if the element also has the 'hidden-when-readonly' class, it is hidden.
     * @param {Element|null} dataItem The specific item to mark as readonly, instead of the whole datalist
     * @param {boolean} eventless Whether to skip event callbacks or not
     */
    protected applyReadonlyMode(dataItem: Element|null = null, eventless: boolean = false): void {
        let readonlyClass = 'data-item-readonly'
        if (dataItem === null) {
            dataItem = this.disableContainer ?? this.dataprovider;
            dataItem.classList.add('datalist-readonly');
        } else {
            dataItem.classList.add('data-item-inactive');
            readonlyClass = 'data-item-individual-readonly';
            if (eventless === false && this.onItemDisableEvent !== null) {
                this.onItemDisableEvent(this, dataItem);
            }
        }

        const readonlySensitiveItems = dataItem.querySelectorAll('.data-item-readonly-sensitive');
        for (let i = 0; i < readonlySensitiveItems.length; i++) {
            const item = readonlySensitiveItems[i] as HTMLElement;
            switch (item.tagName) {
                case 'INPUT':
                    const input = item as HTMLInputElement;
                    switch (input.type) {
                        case 'radio':
                        case 'checkbox':
                            this.markItemAsDisabled(item);
                            break;
                        default:
                            this.markItemAsReadonly(item);
                    }

                    break;
                case 'TEXTAREA':
                    this.markItemAsReadonly(item);
                    break;
                default:
                case 'A':
                case 'BUTTON':
                case 'SELECT':
                    this.markItemAsDisabled(item);
                    break;
            }

            item.classList.add(readonlyClass)
            if (item.classList.contains('hidden-when-readonly')) {
                item.classList.add('hidden');
            }
        }
    }

    /**
     * Undoes the effects from the 'applyReadonlyMode' method. Does not undo the effects if it is still marked as readonly by the other kind of switch.
     * @param {Element|null} dataItem The specific item to mark as readonly, instead of the whole datalist
     * @param {boolean} eventless Whether to skip event callbacks or not
     * @protected
     */
    protected removeReadonlyMode(dataItem: Element|null = null, eventless: boolean = false): void {
        let readonlyClass = 'data-item-readonly'
        if (dataItem === null) {
            dataItem = this.disableContainer ?? this.dataprovider;
            dataItem.classList.remove('datalist-readonly');
        } else {
            dataItem.classList.remove('data-item-inactive');
            readonlyClass = 'data-item-individual-readonly';
            if (eventless === false && this.onItemEnableEvent !== null) {
                this.onItemEnableEvent(this, dataItem);
            }
        }

        const readonlyItems = dataItem.querySelectorAll('.data-item-readonly-sensitive.'+readonlyClass);
        for (let i = 0; i < readonlyItems.length; i++) {
            const item = readonlyItems[i] as HTMLElement;
            item.classList.remove(readonlyClass)
            if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
                continue;
            }

            switch (item.tagName) {
                case 'INPUT':
                    const input = item as HTMLInputElement;
                    switch (input.type) {
                        case 'radio':
                        case 'checkbox':
                            this.unmarkItemAsDisabled(item);
                            break;
                        default:
                            this.unmarkItemAsReadonly(item);
                    }

                    break;
                case 'TEXTAREA':
                    this.unmarkItemAsReadonly(item);
                    break;
                default:
                case 'A':
                case 'BUTTON':
                case 'SELECT':
                    this.unmarkItemAsDisabled(item);
                    break;
            }

            if (item.classList.contains('hidden-when-readonly')) {
                item.classList.remove('hidden');
            }
        }
    }

    /**
     * Mark an item as readonly, if it isn't already readonly
     * @param {Element} item The item to marked as readonly
     * @return {Element} the newly marked element
     * @private
     */
    private markItemAsReadonly(item: Element): Element {
        if (item.hasAttribute('readony') === true) {
            return item;
        }

        item.setAttribute('readonly', 'readonly');

        return item;
    }

    /**
     * Mark an item as disabled, if it isn't already disabled
     * @param {Element} item The item to marked as disabled
     * @return {Element} the newly marked element
     * @private
     */
    private markItemAsDisabled(item: Element): Element {
        if (item.hasAttribute('disabled') === true) {
            return item;
        }

        item.setAttribute('disabled', 'disabled');

        return item;
    }

    /**
     * Removed readonly from an item, if it wasn't already readonly nefore
     * @param {Element} item The item to be unmarked
     * @return {Element} the unmarked element
     * @private
     */
    private unmarkItemAsReadonly(item: Element): Element {
        if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
            return item;
        }

        item.removeAttribute('readonly');

        return item;
    }

    /**
     * Removed disabled from an item, if it wasn't already disabled nefore
     * @param {Element} item The item to be unmarked
     * @return {Element} the unmarked element
     * @private
     */
    private unmarkItemAsDisabled(item: Element): Element {
        if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
            return item;
        }

        item.removeAttribute('disabled');

        return item;
    }

    //| Item manipulation

    /**
     * Creates an new item and adds it to the body
     */
    public addNewItem(): void {
        const data = this.newItemData;
        if (this.itemIdentifierKey !== null) {
            data[this.itemIdentifierKey] = this.newItemIdentifier;
        }

        let item = this.createNewItem(data)
        item.classList.add('data-item-readonly-sensitive');
        item.classList.add('hidden-when-readonly');
        if (this.readonly) {
            item.classList.add('data-item-readonly');
            item.classList.add('hidden')
        }

        if (this.onItemCreateEvent !== null) {
            const newItem = this.onItemCreateEvent(this, item, data);
            if (newItem instanceof HTMLElement) {
                item = newItem;
            }
        }

        this.body.prepend(this.addItemEvents(item, data));
    }

    /**
     * Creates a new item;
     */
    protected createNewItem(data:{[key:string]:any}): HTMLElement {
        return this.createItem(data);
    }

    /**
     * Adds an item to the dataprovider's body
     * @param {Array} data Associative array to add
     * @return void
     */
    protected addItem(data:{[key:string]:any}): void {
        let item = this.createItem(data);

        if (this.onItemCreateEvent !== null) {
            const newItem = this.onItemCreateEvent(this, item, data);
            if (newItem instanceof HTMLElement) {
                item = newItem;
            }
        }

        this.body.append(this.addItemEvents(item, data));
    }

    /**
     * Creates a new item to be added to the body
     * @param {Array} data Associative array to add
     * @return {HTMLElement} The created item
     */
    protected abstract createItem(data:{[key:string]:any}): HTMLElement;

    /**
     * Adds events to an item where applicable
     * @param {Element} item The item to apply events to
     * @param {Array} data Associative array with data for this item
     * @return {Element} The item with events applied
     * @protected
     */
    protected addItemEvents(item: HTMLElement, data:{[key:string]:any}): HTMLElement {
        if (this.itemActivityKey !== null) {
            const activityCheckbox = item.querySelector(`[type="checkbox"][name="${this.itemActivityKey}"]`) as HTMLInputElement|null
            if (activityCheckbox !== null) {
                activityCheckbox.addEventListener('change', this.toggleItemActivityEvent.bind(this, activityCheckbox));
            }
        }

        if (this.itemActivityKey !== null && data[this.itemActivityKey] == false) {
            this.applyReadonlyMode(item, true);
        }

        return item;
    }
}
