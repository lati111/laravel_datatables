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
    private popstateHandler: (() => void) | null = null;
    private pendingLoad: Promise<void> | null = null;
    private nextLoadArgs: {shouldResetPagination: boolean, keepContents: boolean} | null = null;

    /** Initializes the dataprovider: runs setup, loads filters, then fetches data or restores from URL state. */
    public async init(): Promise<void> {
        this.setup();

        await this.filterInit()

        if (this.history === true) {
            await this.loadFromUrlStorage();
            this.popstateHandler = this.loadFromUrlStorage.bind(this);
            window.addEventListener("popstate", this.popstateHandler);
        } else {
            await this.load();
        }
    }

    /**
     * Tears down listeners attached to window. Call when removing a dataprovider from the page
     * (e.g. SPA navigation, modal close) to prevent listener accumulation.
     */
    public destroy(): void {
        if (this.popstateHandler !== null) {
            window.removeEventListener("popstate", this.popstateHandler);
            this.popstateHandler = null;
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
    public async load(shouldResetPagination: boolean = false, keepContents: boolean = false): Promise<void> {
        if (this.blockLoading) {
            return;
        }

        // Coalesce concurrent loads: if one is in flight, remember the latest args
        // and re-run after current load finishes. Multiple intervening calls collapse
        // into a single trailing load with the most recent args.
        if (this.pendingLoad !== null) {
            this.nextLoadArgs = {shouldResetPagination, keepContents};
            return this.pendingLoad;
        }

        this.pendingLoad = this.performLoad(shouldResetPagination, keepContents);
        try {
            await this.pendingLoad;
        } finally {
            this.pendingLoad = null;
        }

        if (this.nextLoadArgs !== null) {
            const args = this.nextLoadArgs;
            this.nextLoadArgs = null;
            await this.load(args.shouldResetPagination, args.keepContents);
        }
    }

    private async performLoad(shouldResetPagination: boolean, keepContents: boolean): Promise<void> {
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

            if (rawData.pagination && this.pagination !== null && typeof rawData.pagination.pages === 'number') {
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
