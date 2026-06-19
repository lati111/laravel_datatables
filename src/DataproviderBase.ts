import {DataproviderCore} from "./DataproviderCore";
import {ReadonlyMixin} from "./Mixins/ReadonlyMixin";
import {FilterMixin} from "./Mixins/FilterMixin";
import {StatePersistenceMixin} from "./Mixins/StatePersistenceMixin";
import {UrlMixin} from "./Mixins/UrlMixin";
import {PaginationMixin} from "./Mixins/PaginationMixin";
import {SearchMixin} from "./Mixins/SearchMixin";
import {ItemMixin} from "./Mixins/ItemMixin";

// Compose mixins in dependency order:
// Readonly (no deps) -> Filter (needs load) -> StatePersistence (needs Filter)
// -> Url (needs StatePersistence) -> Pagination (needs Url) -> Search (needs load)
// -> Item (needs Readonly)
const WithReadonly = ReadonlyMixin(DataproviderCore);
const WithFilters = FilterMixin(WithReadonly);
const WithStatePersistence = StatePersistenceMixin(WithFilters);
const WithUrl = UrlMixin(WithStatePersistence);
const WithPagination = PaginationMixin(WithUrl);
const WithSearch = SearchMixin(WithPagination);
const WithItems = ItemMixin(WithSearch);

/**
 * Base class for all dataproviders. Composes all mixins and orchestrates
 * initialization, DOM setup, data fetching, and rendering.
 *
 * Subclasses must implement {@link fetchData}, {@link postData}, and {@link createItem}.
 */
export abstract class DataproviderBase extends WithItems {
    /** Initializes the dataprovider: runs setup, loads filters, then fetches data or restores from URL state. */
    public async init(): Promise<void> {
        this.setup();

        await this.filterInit()

        if (this.history === true) {
            await this.loadFromUrlStorage();
            window.addEventListener("popstate", this.loadFromUrlStorage.bind(this));
        } else {
            await this.load();
        }
    }

    /** Initializes all DOM elements (body, spinner, pagination, searchbar, filters). Subclasses must call `super.setup()`. */
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
        this.filterSetup();
    }

    /**
     * Fetches data and renders items. Handles schema v3 combined responses,
     * pagination, history state, and readonly mode.
     *
     * @param shouldResetPagination - When true, resets to page 1 before fetching.
     * @param keepContents - When true, appends new items instead of clearing existing ones.
     */
    public async load(shouldResetPagination: boolean = false, keepContents: boolean = false) {
        if (this.blockLoading || this.loading) {
            return;
        }

        this.loading = true;
        this.showLoadingState();

        if (!keepContents) {
            this.body.innerHTML = '';
        }

        if (this.pagination !== null && shouldResetPagination) {
            this.page = 1;
        }

        const url = this.generateDataUrl();
        const rawData = await this.fetchData(url.toString())

        // schema v3 wraps items and pagination in an envelope object
        let data: any;
        let schemaV3 = false;
        if (rawData !== null && typeof rawData === 'object' && !Array.isArray(rawData) && 'items' in rawData) {
            schemaV3 = true;
            data = rawData.items;

            if (rawData.pagination && this.pagination !== null) {
                this.pages = rawData.pagination.pages;
            }
        } else {
            data = rawData;
        }

        let empty = true;
        let key: keyof typeof data;
        for (key in data) {
            this.addItem(data[key]);
            empty = false;
        }

        if (empty && !keepContents) {
            this.body.innerHTML = this.emptyBody;
        }

        this.hideLoadingState();

        if (schemaV3 && this.pagination !== null) {
            this.renderPagination();
        } else {
            await this.fillPagination()
        }

        this.pushHistoryState();

        this.loading = false;

        if (this.readonly) {
            this.applyReadonlyMode();
        }

        if (this.onLoadFinishedEvent !== null) {
            this.onLoadFinishedEvent(this)
        }
    }

    private showLoadingState(): void {
        if (this.spinner !== null) {
            this.spinner.classList.remove('hidden');
        }
        if (this.disableContainer !== null) {
            this.disableContainer.setAttribute('disabled', 'disabled');
        }
        if (!this.showBodyDuringLoad) {
            this.body.classList.add('hidden');
        }
    }

    private hideLoadingState(): void {
        if (this.spinner !== null) {
            this.spinner.classList.add('hidden');
        }
        if (!this.showBodyDuringLoad) {
            this.body.classList.remove('hidden');
        }
        if (this.disableContainer !== null) {
            this.disableContainer.removeAttribute('disabled');
        }
    }

    private pushHistoryState(): void {
        if (this.history !== true) {
            return;
        }
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set(this.dataproviderID, JSON.stringify(this.getStorableData()));
        window.history.pushState({urlPath: currentUrl.toString()}, '', currentUrl.toString());
    }
}
