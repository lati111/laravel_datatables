import {DataproviderCore} from "./DataproviderCore";
import {ReadonlyMixin} from "./Mixins/ReadonlyMixin";
import {FilterMixin} from "./Mixins/FilterMixin";
import {StatePersistenceMixin} from "./Mixins/StatePersistenceMixin";
import {UrlMixin} from "./Mixins/UrlMixin";
import {PaginationMixin} from "./Mixins/PaginationMixin";
import {SearchMixin} from "./Mixins/SearchMixin";
import {ItemMixin} from "./Mixins/ItemMixin";

// Compose mixins in dependency order:
// Readonly (no deps) → Filter (needs load) → StatePersistence (needs Filter)
// → Url (needs StatePersistence) → Pagination (needs Url) → Search (needs load)
// → Item (needs Readonly)
const WithReadonly = ReadonlyMixin(DataproviderCore);
const WithFilters = FilterMixin(WithReadonly);
const WithStatePersistence = StatePersistenceMixin(WithFilters);
const WithUrl = UrlMixin(WithStatePersistence);
const WithPagination = PaginationMixin(WithUrl);
const WithSearch = SearchMixin(WithPagination);
const WithItems = ItemMixin(WithSearch);

export abstract class DataproviderBase extends WithItems {
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
        const rawData = await this.fetchData(url.toString())

        // detect schema v3 combined response
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
        if (schemaV3 && this.pagination !== null) {
            this.renderPagination();
        } else {
            await this.fillPagination()
        }

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

        // fire event
        if (this.onLoadFinishedEvent !== null) {
            this.onLoadFinishedEvent(this)
        }
    }
}
