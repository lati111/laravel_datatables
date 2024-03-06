export abstract class DataproviderBase {
    /** @protected {Element} The main element of the data provider */
    public dataprovider: Element

    /** @protected {string} The ID of the dataprovider */
    protected readonly dataproviderID: string;

    /** @protected {string} The data url set by the dataprovider */
    public url: string;

    /** @protected {string} The template url for when dynamicUrl is enabled */
    public urlTemplate: string;

    /** @protected {boolean} Determines if this dataprovider should save it's history */
    protected history: boolean = true;

    /** @protected {boolean} Determines if the url's may be changed  */
    protected dynamicUrl: boolean = true;

    /** @protected {boolean} If true prevents from loading data */
    protected blockLoading: boolean = false;

    /** @protected {boolean} Whether or not this dataprovider is readonly (has no effects on base) */
    protected readonly: boolean = false;

    /** @protected {Element} The element content should be placed in */
    protected body: Element;

    /** @protected {string} The text that should be displayed when body is empty */
    protected emptyBody = '';

    /** @protected {Element|null} The spinner element to be shown when loading */
    protected spinner: Element | null = null;

    /** @protected {boolean} Whether to keep the body visible while loading if a spinner is present. */
    protected showBodyDuringLoad: boolean = true;

    // pagination

    /** @protected {Element|null} The main pagination element */
    protected pagination: Element | null = null;

    /** @protected {Element|null} The element pagination content should be placed in */
    protected paginationContent: Element | null = null;

    /** @protected {HTMLSelectElement|null} The per page selector element */
    protected perpageSelector: HTMLSelectElement | null = null;

    /** @protected {HTMLButtonElement|null} The button to be clicked to go 1 page backwards */
    protected prevBtn: HTMLButtonElement | null = null;

    /** @protected {HTMLButtonElement|null} The button to be clicked to go 1 page forwards */
    protected nextBtn: HTMLButtonElement | null = null;

    /** @protected {string|null} The classes to be added to all pagination elements */
    protected pageBtnCls: string | null = null;

    /** @protected {string|null} The classes to be added to be added to page buttons */
    protected pageNumberedBtnCls: string | null = null;

    /** @protected {string|null} The classes to be added to the pagination dividers */
    protected pageBtnDividerCls: string | null = null;

    /** @protected {string|null} The classes to be added to the empty page buttons */
    protected pageEmptyBtnCls: string | null = null;

    /** @protected {string|null} The url to retrieve the page count from */
    protected pagecountUrl: string | null = null;

    /** @protected {string|null} The templated url to retrieve the page count from when dynamic urls are enabled*/
    protected pagecountUrlTemplate: string | null = null;

    /** @protected {number|null} The amount of items per page */
    protected perpage: number | null = null;

    /** @protected {number|null} The amount of pages */
    protected pages: number | null = null;

    /** @protected {number|null} The current page */
    protected page: number | null = null;

    /** @protected {number|null} The amount of page buttons in the pagination (this amount to the left and right current page in the middle */
    protected pagesInPagination: number = 7;

    // search

    /** @protected {Element|null} The main searchbar element */
    protected searchbar: Element | null = null;

    /** @protected {HTMLInputElement|null} The actual input of the searchbar */
    protected searchbarInput: HTMLInputElement | null = null;

    /** @protected {HTMLButtonElement|null} The confirmation button of the searchbar */
    protected searchbarConfirmButton: HTMLButtonElement | null = null;

    /** @protected {string|null} The term to be searched for */
    protected searchterm: string | null = null;

    public constructor(dataprovider: Element | string) {
        if (typeof dataprovider === 'string') {
            dataprovider = document.querySelector('#' + dataprovider + '.dataprovider')!;
        }

        this.dataprovider = dataprovider;
        this.dataproviderID = dataprovider.id;

        const dataUrl = this.dataprovider.getAttribute('data-content-url');
        if (dataUrl === null) {
            throw new Error('Could not find attribute data-content-url on dataprovider with ID ' + dataUrl);
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
     * Initializes the dataprovider
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
        this.initBody()
        this.initSpinner()

        if (this.dataprovider.getAttribute('data-dynamic-url') === 'true') {
            this.dynamicUrl = true;
            this.blockLoading = true;
        }

        this.initPagination()
        this.initSearchbar();
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
            throw new Error('Could not find content on dataprovider with ID ' + contentID);
        }
        this.body = contentElement;
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
            console.error('Pagination with ID "'+paginationID+'" is missing attribute "data-count-url"')
            return;
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
        const searchBtnID = searchbarElement.getAttribute('data-confirm-button-ID')
        if (searchBtnID !== undefined) {
            const searchBtnElement = document.querySelector('#'+searchBtnID) as HTMLButtonElement|null;
            if (searchBtnElement !== null) {
                searchBtnElement.addEventListener('click', loadFunc)
                this.searchbarConfirmButton = searchBtnElement
            }
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
     * @param {Event} e The triggering event
     * @return void
     */
    protected async perPageChangeEvent(e:Event) {
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
        if (e instanceof  KeyboardEvent) {
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
    private createPaginationNode(text:string, page:number, current:boolean = false): HTMLButtonElement {
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
    private createPaginationDivider():HTMLSpanElement {
        const element = document.createElement('span');
        element.classList.value = this.pageBtnCls + ' ' + this.pageBtnDividerCls;
        element.textContent = '...';
        return element;
    }

    /**
     * Generates a placeholder element to use when a page does not exist on that location to maintain spacing
     * @return {HTMLButtonElement} Returns the generated element
     */
    private createEmptyPaginationNode():HTMLButtonElement {
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

        return url;
    }

    /**
     * Modifies the urls of this dataprovider and resets it
     * @param {array} replacers Associative array filled with replacers
     * @return void
     */
    public async modifyUrl(replacers:{[key:string]:string}) {
        this.blockLoading = false;
        this.changeUrls(replacers);

        await this.load(true);
    }

    /**
     * Changes all the urls on record for this dataprovider
     * @param {array} replacers Associative array filled with replacers
     * @return void
     */
    protected changeUrls(replacers:{[key:string]:string}): void {
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
        if (this.blockLoading) {
            return;
        }

        // show the spinner if it is enabled
        if (this.spinner !== null) {
            this.spinner.classList.remove('hidden');
        }

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

        if (empty) {
            this.body.innerHTML = this.emptyBody;
        }

        // hide the spinner if it is enabled
        if (this.spinner !== null) {
            this.spinner.classList.add('hidden');
        }

        if (!this.showBodyDuringLoad) {
            this.body.classList.remove('hidden');
        }

        // refill the pagination
        await this.fillPagination()

        // save data history
        if (this.history === true) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set(this.dataproviderID, JSON.stringify(this.getStorableData()))
            window.history.pushState({urlPath:currentUrl.toString()}, '', currentUrl.toString());
        }
    }

    /**
     * Gets the dataprovider data from the provided url through an ajax request
     * @param {string} url The url to retrieve data from
     * @return {any} Returns the data from the url
     */
    abstract fetchData(url: string): any;

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
    }


    /**
     * Adds an item to the dataprovider's body
     * @param {Array} data Associative array to add
     * @return void
     */
    abstract addItem(data:{[key:string]:any}): void;
}