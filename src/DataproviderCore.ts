import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {Filter} from "./Data/Filter";

/**
 * Core abstract base for all dataproviders.
 *
 * Declares all shared properties and abstract method signatures.
 * Concrete method implementations are provided by mixins which are
 * composed together in DataproviderBase.
 */
export abstract class DataproviderCore {
    //| Core properties
    public dataprovider: Element
    public readonly dataproviderID: string;
    public url: string;
    public urlTemplate: string;
    protected errorCallback: Function|null;

    //| Dataprovider settings
    protected history: boolean = true;
    protected dynamicUrl: boolean = true;
    protected blockLoading: boolean = false;
    protected showBodyDuringLoad: boolean = true;
    protected readonly: boolean = false;
    protected loading: boolean = false;

    //| Body properties
    public body: Element;
    protected emptyBody = '';
    protected spinner: Element | null = null;
    public disableContainer: Element | null = null;

    //| Data item properties
    public itemIdentifierKey: string|null = null;
    public itemLabelKey: string|null = null;
    protected itemActivityKey: string|null = null;
    protected newItemIdentifier: string = 'new_data_item';
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

    //| Filter properties
    public filters: Array<Filter> = [];
    protected filterForm: HTMLElement|null = null;
    protected filterlist: HTMLElement|null = null;
    protected addFilterButton: HTMLButtonElement|null = null;
    protected filterSelect: HTMLSelectElement|null = null;
    protected operatorSelect: HTMLSelectElement|null = null;
    public filterAddedEvent: Function|null = null;

    //| Custom selection properties
    public customSelectProperties: {[key:string]: boolean} = {}

    //| Event callbacks
    public onLoadFinishedEvent: Function|null = null;
    public onItemCreateEvent: Function|null = null;
    public onItemEnableEvent: Function|null = null;
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

    //| Core initialization methods

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

    protected initSpinner() {
        const spinnerElement = this.resolveElement('data-spinner-ID', '-spinner', '.spinner');
        if (spinnerElement !== null) {
            this.spinner = spinnerElement;
            this.showBodyDuringLoad = spinnerElement.getAttribute('data-hide-body') === 'false';
        }
    }

    protected resolveElement<T extends Element>(
        attrName: string,
        defaultSuffix: string,
        selector: string = ''
    ): T | null {
        const id = this.dataprovider.getAttribute(attrName) ?? this.dataproviderID + defaultSuffix;
        return document.querySelector('#' + id + selector) as T | null;
    }

    protected formatString(string:string) {
        string = string.replace(/_/g, ' ');
        string = string.charAt(0).toUpperCase() + string.slice(1);
        return string;
    }

    //| Truly abstract methods — implemented by template subclasses
    abstract fetchData(url: string): any;
    abstract postData(url:string, parameters: FormData): any;
    protected abstract createItem(data:{[key:string]:any}): HTMLElement;

    //| Abstract method signatures — implemented by mixins

    // Pagination
    protected abstract initPagination(): void;
    protected abstract fillPagination(): Promise<void>;
    protected abstract renderPagination(): void;
    protected abstract createPaginationNode(text:string, page:number, current?:boolean): HTMLButtonElement;
    protected abstract createPaginationDivider(): HTMLSpanElement;
    protected abstract createEmptyPaginationNode(): HTMLButtonElement;
    protected abstract pageChangeEvent(e:Event): Promise<void>;
    protected abstract perPageChangeEvent(): Promise<void>;

    // Search
    protected abstract initSearchbar(): void;
    protected abstract searchbarEvent(e:Event): Promise<void>;

    // Filters
    protected abstract filterSetup(): void;
    protected abstract filterInit(): Promise<void>;
    protected abstract addFilter(displayString:string, filter:string, operator:string, value?:string|null, init?:boolean): boolean;
    protected abstract getFilters(): Array<Filter>;
    protected abstract normalizeFilterCheckboxes(data:{[key:string]: any}): void;
    protected abstract resetFilterSelects(): void;
    protected abstract addFilterDisplay(filter:Filter): void;
    protected abstract createFilterDisplay(filter:Filter): HTMLElement;
    protected abstract onFilterSelectEvent(): Promise<void>;
    protected abstract performOnfilterSelect(data:{[key:string]:any}): Promise<void>;
    protected abstract addFilterEvent(): Promise<void>;
    protected abstract performAddFilterEvent(filter:string, type:string, operator:string): Promise<void>;
    protected abstract removeFilterEvent(filterElement: HTMLElement): Promise<void>;
    public abstract addManualFilter(filter:string, operator:string, value?:string|null, init?:boolean): boolean;

    // Readonly
    protected abstract applyReadonlyMode(dataItem?: Element|null, eventless?: boolean): void;
    protected abstract removeReadonlyMode(dataItem?: Element|null, eventless?: boolean): void;
    public abstract enableReadonlyMode(): void;
    public abstract disableReadonlyMode(): void;
    protected abstract toggleItemActivityEvent(element:HTMLInputElement): void;

    // State persistence
    protected abstract getStorableData(): {[key: string]: any};
    protected abstract loadDataFromStorage(data:{[key:string]: any}): void;
    protected abstract getStorableFilterData(): Array<any>|null;
    protected abstract loadStoredFilterData(data:{[key:string]: any}): void;
    protected abstract performLoadStoredFilterData(filter:{[key:string]:string}): void;
    public abstract loadFromUrlStorage(): Promise<void>;

    // URL
    public abstract generateDataUrl(baseUrl?:string): URL;
    public abstract modifyUrl(replacers:{[key:string]:string}): Promise<void>;
    protected abstract changeUrls(replacers:{[key:string]:string}): Promise<void>;
    protected abstract changeUrl(url:string, replacers:{[key:string]:string}): string;
    public abstract setCustomSelect(column: string, show: boolean|null): void;

    // Items
    public abstract addNewItem(): void;
    protected abstract createNewItem(data:{[key:string]:any}): HTMLElement;
    protected abstract addItem(data:{[key:string]:any}): void;
    protected abstract addItemEvents(item: HTMLElement, data:{[key:string]:any}): HTMLElement;
    protected abstract initItemParameters(): void;

    // Load
    public abstract load(shouldResetPagination?: boolean, keepContents?: boolean): Promise<void>;
}
