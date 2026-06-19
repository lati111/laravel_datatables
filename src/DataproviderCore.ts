import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {Filter} from "./Data/Filter";
import type {DataRecord, ErrorCallback} from "./Mixins/types";

/**
 * Core abstract base for all dataproviders.
 *
 * Declares shared properties and abstract method signatures.
 * Concrete implementations are provided by mixins composed in {@link DataproviderBase}.
 */
export abstract class DataproviderCore {
    /** The root dataprovider DOM element. */
    public dataprovider: Element

    /** Unique ID of the dataprovider, taken from the root element's `id` attribute. */
    public readonly dataproviderID: string;

    /** Current data URL (may be modified by {@link changeUrls}). */
    public url: string;

    /** Original URL template with placeholders, used to regenerate `url` via {@link changeUrl}. */
    public urlTemplate: string;

    /** Optional error handler invoked by datalist exceptions before they throw. */
    protected errorCallback: ErrorCallback;

    /** Whether to persist and restore state via URL query parameters. */
    protected history: boolean = true;

    /** Whether the data URL contains placeholders that must be resolved before loading. */
    protected dynamicUrl: boolean = true;

    /** When true, {@link load} returns immediately without fetching. */
    protected blockLoading: boolean = false;

    /** When false, the body is hidden during data fetches (requires a spinner element). */
    protected showBodyDuringLoad: boolean = true;

    /** Whether the dataprovider is in readonly mode. */
    protected readonly: boolean = false;

    /** Guard flag to prevent concurrent loads. */
    protected loading: boolean = false;

    /** The container element where data items are rendered. */
    public body: Element;

    /** HTML to display when no data items are returned. */
    protected emptyBody = '';

    /** Optional spinner element shown during data fetches. */
    protected spinner: Element | null = null;

    /** Optional wrapper element that gets a `disabled` attribute during loads. */
    public disableContainer: Element | null = null;

    /** Data attribute key used to uniquely identify each item (e.g. `id`). */
    public itemIdentifierKey: string|null = null;

    /** Data attribute key used for display labels. Falls back to {@link itemIdentifierKey}. */
    public itemLabelKey: string|null = null;

    /** Data attribute key controlling per-item active/inactive state. */
    protected itemActivityKey: string|null = null;

    /** Identifier value assigned to newly created items. */
    protected newItemIdentifier: string = 'new_data_item';

    /** Default data object merged into new items created by {@link addNewItem}. */
    public newItemData: DataRecord = {};

    /** Root pagination element, or null if pagination is disabled. */
    protected pagination: Element | null = null;

    /** Container for page number buttons inside the pagination element. */
    protected paginationContent: Element | null = null;

    /** Per-page size selector dropdown. */
    protected perpageSelector: HTMLSelectElement | null = null;

    /** Previous-page navigation button. */
    protected prevBtn: HTMLButtonElement | null = null;

    /** Next-page navigation button. */
    protected nextBtn: HTMLButtonElement | null = null;

    /** URL for fetching total page count (legacy, pre-schema-v3). */
    protected pagecountUrl: string | null = null;

    /** Original page-count URL template with placeholders. */
    protected pagecountUrlTemplate: string | null = null;

    /** Items per page, or null if pagination is disabled. */
    protected perpage: number | null = null;

    /** Total number of pages, populated after a page count fetch or schema v3 response. */
    protected pages: number | null = null;

    /** Current page number (1-based). */
    protected page: number | null = null;

    /** Maximum number of page buttons shown in the pagination bar. */
    protected pagesInPagination: number = 7;

    /** CSS class applied to all pagination buttons (page numbers, dividers, empties). */
    protected pageBtnCls: string | null = null;

    /** CSS class applied specifically to numbered page buttons. */
    protected pageNumberedBtnCls: string | null = null;

    /** CSS class applied to `...` divider elements in pagination. */
    protected pageBtnDividerCls: string | null = null;

    /** CSS class applied to empty placeholder buttons in pagination. */
    protected pageEmptyBtnCls: string | null = null;

    /** Root searchbar element, or null if search is disabled. */
    protected searchbar: Element | null = null;

    /** Text input element for search queries. */
    protected searchbarInput: HTMLInputElement | null = null;

    /** Button that triggers a search when clicked. */
    protected searchbarConfirmButton: HTMLButtonElement | null = null;

    /** Current search query string. */
    protected searchterm: string | null = null;

    /** Active filters applied to data requests. */
    public filters: Array<Filter> = [];

    /** The filter form container element. */
    protected filterForm: HTMLElement|null = null;

    /** Container where active filter display chips are rendered. */
    protected filterlist: HTMLElement|null = null;

    /** Button that confirms adding a new filter from the form. */
    protected addFilterButton: HTMLButtonElement|null = null;

    /** Dropdown for selecting which column to filter on. */
    protected filterSelect: HTMLSelectElement|null = null;

    /** Dropdown for selecting the filter operator (=, !=, >, etc.). */
    protected operatorSelect: HTMLSelectElement|null = null;

    /** Called after a filter is added via the filter form. Receives `(dataprovider, filter)`. */
    public filterAddedEvent: Function|null = null;

    /** Column visibility overrides sent as the `columns` query parameter. */
    public customSelectProperties: {[key:string]: boolean} = {}

    /** Called after {@link load} completes. Receives `(dataprovider)`. */
    public onLoadFinishedEvent: Function|null = null;

    /** Called when an item is created. Receives `(dataprovider, element, data)`. May return a replacement element. */
    public onItemCreateEvent: Function|null = null;

    /** Called when an item is enabled (readonly removed). Receives `(dataprovider, element)`. */
    public onItemEnableEvent: Function|null = null;

    /** Called when an item is disabled (readonly applied). Receives `(dataprovider, element)`. */
    public onItemDisableEvent: Function|null = null;

    /**
     * @param dataprovider - Root element or its ID string. Must have class `dataprovider` and attribute `data-content-url`.
     * @param errorCallback - Optional handler called by exceptions before throwing.
     */
    public constructor(dataprovider: Element | string, errorCallback: ErrorCallback = null) {
        this.errorCallback = errorCallback;

        if (typeof dataprovider === 'string') {
            dataprovider = document.querySelector('#' + dataprovider + '.dataprovider')!;
        }

        this.dataprovider = dataprovider;
        this.dataproviderID = dataprovider.id;

        const dataUrl = this.dataprovider.getAttribute('data-content-url');
        if (dataUrl === null) {
            throw new DatalistConstructionError('Could not find attribute data-content-url on dataprovider with ID ' + this.dataproviderID, this.errorCallback);
        }

        const history = this.dataprovider.getAttribute('data-history');
        if (history === 'false') {
            this.history = false;
        }

        this.url = dataUrl;
        this.urlTemplate = dataUrl;
        this.body = this.dataprovider
    }

    /** Initializes the body content container and optional disable-container from DOM attributes. */
    protected initBody() {
        this.emptyBody = this.dataprovider.getAttribute('data-empty-body') ?? '';

        const contentElement = this.resolveElement('data-content-ID', '-content');
        if (contentElement === null) {
            const contentID = this.dataprovider.getAttribute('data-content-ID') ?? this.dataproviderID + '-content';
            throw new DatalistConstructionError('Could not find content on dataprovider with ID ' + contentID, this.errorCallback);
        }
        this.body = contentElement;

        this.disableContainer = this.resolveElement('data-disable-container-ID', '-disable-container');
    }

    /** Initializes the spinner element and `showBodyDuringLoad` setting. */
    protected initSpinner() {
        const spinnerElement = this.resolveElement('data-spinner-ID', '-spinner', '.spinner');
        if (spinnerElement !== null) {
            this.spinner = spinnerElement;
            this.showBodyDuringLoad = spinnerElement.getAttribute('data-hide-body') === 'false';
        }
    }

    /**
     * Resolves a DOM element by reading an ID from a data attribute with a default fallback.
     *
     * @param attrName - Data attribute name on the dataprovider element (e.g. `data-content-ID`).
     * @param defaultSuffix - Suffix appended to dataproviderID if the attribute is absent.
     * @param selector - Additional CSS selector appended after `#id` (e.g. `.spinner`).
     */
    protected resolveElement<T extends Element>(
        attrName: string,
        defaultSuffix: string,
        selector: string = ''
    ): T | null {
        const id = this.dataprovider.getAttribute(attrName) ?? this.dataproviderID + defaultSuffix;
        return document.querySelector('#' + id + selector) as T | null;
    }

    /** Formats a snake_case string to title case (replaces underscores with spaces, capitalizes first letter). */
    protected formatString(string:string) {
        string = string.replace(/_/g, ' ');
        string = string.charAt(0).toUpperCase() + string.slice(1);
        return string;
    }

    /**
     * Fetches data from the server. Implementors must return parsed JSON data.
     * @param url - Fully-constructed URL including query parameters.
     */
    abstract fetchData(url: string): any;

    /**
     * Posts data to the server. Used for form submissions (inline editing, new items).
     * @param url - Target endpoint URL.
     * @param parameters - Form data to submit.
     */
    abstract postData(url:string, parameters: FormData): any;

    /**
     * Creates a DOM element for a single data record. Called once per item during {@link load}.
     * @param data - Key-value data for the item.
     */
    protected abstract createItem(data: DataRecord): HTMLElement;

    //| Abstract method signatures — implemented by mixins

    // Pagination
    /** Reads pagination configuration from DOM attributes and sets up event listeners. */
    protected abstract initPagination(): void;
    /** Fetches page count from server and renders pagination UI (legacy, pre-schema-v3). */
    protected abstract fillPagination(): Promise<void>;
    /** Renders pagination buttons based on current page and total pages. */
    protected abstract renderPagination(): void;
    /** Creates a clickable page number button. */
    protected abstract createPaginationNode(text:string, page:number, current?:boolean): HTMLButtonElement;
    /** Creates a `...` divider element for pagination gaps. */
    protected abstract createPaginationDivider(): HTMLSpanElement;
    /** Creates an invisible placeholder button to maintain pagination layout. */
    protected abstract createEmptyPaginationNode(): HTMLButtonElement;
    /** Handles page button clicks, updating the current page and reloading. */
    protected abstract pageChangeEvent(e:Event): Promise<void>;
    /** Handles per-page selector changes, updating perpage and reloading. */
    protected abstract perPageChangeEvent(): Promise<void>;

    // Search
    /** Reads searchbar configuration from DOM attributes and sets up event listeners. */
    protected abstract initSearchbar(): void;
    /** Handles search input submission (Enter key or button click). */
    protected abstract searchbarEvent(e:Event): Promise<void>;

    // Filters
    /** Sets up filter checkboxes, inputs, form elements, and event listeners. Subclasses must call `super.filterSetup()`. */
    protected abstract filterSetup(): void;
    /** Fetches available filter options from the server and populates the filter select. */
    protected abstract filterInit(): Promise<void>;
    /** Adds a filter from the filter form and triggers a reload. */
    protected abstract addFilter(displayString:string, filter:string, operator:string, value?:string|null, init?:boolean): boolean;
    /** Collects all active filters (form, checkbox, and input types) into a single array. */
    protected abstract getFilters(): Array<Filter>;
    /** Synchronizes checkbox checked states with stored filter data after restoring from URL. */
    protected abstract normalizeFilterCheckboxes(data: DataRecord): void;
    /** Resets filter form selects to their initial hidden/ordered state. */
    protected abstract resetFilterSelects(): void;
    /** Creates a display chip for a filter and appends it to the filter list. */
    protected abstract addFilterDisplay(filter:Filter): void;
    /** Creates the DOM element for a filter display chip with a delete button. */
    protected abstract createFilterDisplay(filter:Filter): HTMLElement;
    /** Handles filter column selection, fetching operators and configuring the value input. */
    protected abstract onFilterSelectEvent(): Promise<void>;
    /** Configures the filter value input based on filter type (select, bool, number, date). */
    protected abstract performOnfilterSelect(data: DataRecord): Promise<void>;
    /** Reads current filter form state and delegates to {@link performAddFilterEvent}. */
    protected abstract addFilterEvent(): Promise<void>;
    /** Constructs the filter display string and calls {@link addFilter} for the given type. */
    protected abstract performAddFilterEvent(filter:string, type:string, operator:string): Promise<void>;
    /** Removes a filter by its display element and reloads. */
    protected abstract removeFilterEvent(filterElement: HTMLElement): Promise<void>;
    /** Adds a programmatic filter (not from the filter form UI). */
    public abstract addManualFilter(filter:string, operator:string, value?:string|null, init?:boolean): boolean;

    // Readonly
    /** Applies readonly state to all sensitive elements within a scope. */
    protected abstract applyReadonlyMode(dataItem?: Element|null, eventless?: boolean): void;
    /** Removes readonly state from all sensitive elements within a scope. */
    protected abstract removeReadonlyMode(dataItem?: Element|null, eventless?: boolean): void;
    /** Enables readonly mode globally and applies it to all current items. */
    public abstract enableReadonlyMode(): void;
    /** Disables readonly mode globally and removes it from all current items. */
    public abstract disableReadonlyMode(): void;
    /** Toggles readonly mode on a single data item based on an activity checkbox. */
    protected abstract toggleItemActivityEvent(element:HTMLInputElement): void;

    // State persistence
    /** Serializes current pagination, search, and filter state into a storable object. */
    protected abstract getStorableData(): DataRecord;
    /** Restores pagination, search, and filter state from a previously stored object. */
    protected abstract loadDataFromStorage(data: DataRecord): void;
    /** Serializes active filters into a JSON-safe array, or null if none. */
    protected abstract getStorableFilterData(): Array<any>|null;
    /** Restores filters from stored data by delegating to {@link performLoadStoredFilterData}. */
    protected abstract loadStoredFilterData(data: DataRecord): void;
    /** Restores a single filter from stored data based on its type (manual, form, checkbox, input). */
    protected abstract performLoadStoredFilterData(filter:{[key:string]:string}): void;
    /** Reads stored state from the current URL query string and loads data. */
    public abstract loadFromUrlStorage(): Promise<void>;

    // URL
    /** Builds a complete data URL with pagination, search, filter, and column parameters. */
    public abstract generateDataUrl(baseUrl?:string): URL;
    /** Resolves URL placeholders and triggers a data load. */
    public abstract modifyUrl(replacers:{[key:string]:string}): Promise<void>;
    /** Applies placeholder replacements to both the data URL and page count URL. */
    protected abstract changeUrls(replacers:{[key:string]:string}): Promise<void>;
    /** Replaces placeholder tokens in a URL string. */
    protected abstract changeUrl(url:string, replacers:{[key:string]:string}): string;
    /** Toggles column visibility in the `columns` query parameter. */
    public abstract setCustomSelect(column: string, show: boolean|null): void;

    // Items
    /** Creates and prepends a new empty data item to the body. */
    public abstract addNewItem(): void;
    /** Creates the DOM element for a new (unsaved) data item. Defaults to {@link createItem}. */
    protected abstract createNewItem(data: DataRecord): HTMLElement;
    /** Creates a data item element and appends it to the body. */
    protected abstract addItem(data: DataRecord): void;
    /** Attaches event listeners (activity toggle, etc.) to a rendered data item. */
    protected abstract addItemEvents(item: HTMLElement, data: DataRecord): HTMLElement;
    /** Reads item-related data attributes (identifier key, label key, activity key). */
    protected abstract initItemParameters(): void;

    /** Fetches data and renders items. Orchestrates the full load lifecycle. */
    public abstract load(shouldResetPagination?: boolean, keepContents?: boolean): Promise<void>;
}
