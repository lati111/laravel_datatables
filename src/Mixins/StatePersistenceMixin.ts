/**
 * Mixin that provides state persistence for dataproviders, allowing pagination, search, and filter state to be saved and restored from URL parameters.
 * @module StatePersistenceMixin
 */
import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor, DataRecord} from "./types";

export function StatePersistenceMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithStatePersistence extends Base {
        /** Collects the current pagination, search, and filter state into a serializable object. */
        protected getStorableData(): DataRecord {
            const data: DataRecord = {};

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

        /** Restores pagination, search, and filter state from a previously stored data object. */
        protected loadDataFromStorage(data: DataRecord):void {
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

            this.loadStoredFilterData(data);
            this.normalizeFilterCheckboxes(data);
        }

        /** Converts the current filter state into a serializable array, or null if no filters are active. */
        protected getStorableFilterData(): Array<any>|null {
            const filters = this.getFilters();
            if (filters.length > 0) {
                const filterArray = [];
                for (const filter of filters) {
                    let json: any ={
                        'type': filter.type,
                        'filter': filter.filter,
                        'operator': filter.operator,
                        'value': filter.value,
                    };

                    if (filter.display !== null) {
                        json['display'] = filter.display;
                    }

                    filterArray.push(json);
                }

                return filterArray;
            }

            return null;
        }

        /** Restores filters from stored data by delegating each filter entry to type-specific restoration logic. */
        protected loadStoredFilterData(data: DataRecord): void {
            if (typeof data.filters === 'object') {
                for (const key in data.filters) {
                    const filter = data.filters[key] as {[key:string]:string};
                    this.performLoadStoredFilterData(filter);
                }
            }
        }

        /** Restores a single filter by type (manual, form, checkbox, or input). */
        protected performLoadStoredFilterData(filter:{[key:string]:string}) {
            switch(filter['type']) {
                case 'manual':
                    this.addManualFilter(filter['filter'], filter['operator'], filter['value'] ?? null, true);
                    break;
                case 'form':
                    if (filter['display'] !== undefined && filter['display'] !== null) {
                        this.addFilter(filter['display'], filter['filter'], filter['operator'], filter['value'] ?? null, true);
                        return;
                    }
                    break;
                case 'checkbox':
                    const filterCheckbox = document.querySelector('input[type="checkbox"][name="'+filter['filter']+'"].'+this.dataproviderID+'-filter-checkbox') as HTMLInputElement|null;
                    if (filterCheckbox === null) {
                        return;
                    }

                    if (filterCheckbox.getAttribute('data-checked-operator') === filter['operator']) {
                        if (Object.hasOwn(filter, 'value') && filterCheckbox.getAttribute('data-checked-value') !== filter['value']) {
                            return;
                        }

                        filterCheckbox.checked = true;
                    }
                    break;
                case 'input':
                    const filterInput = document.querySelector('input[name="'+filter['filter']+'"].'+this.dataproviderID+'-filter-input:not([type="checkbox"])') as HTMLInputElement|null;
                    if (filterInput === null) {
                        return;
                    }

                    filterInput.value = filter['value'];
                    break;
            }
        }

        /** Restores dataprovider state from URL query parameters and triggers a data load. */
        public async loadFromUrlStorage():Promise<void> {
            const url = new URL(window.location.href);
            const raw = url.searchParams.get(this.dataproviderID);
            if (raw === null) {
                await this.load();
                return;
            }

            let data: DataRecord;
            try {
                data = JSON.parse(raw);
            } catch (err) {
                console.warn(
                    `[Datalist] Malformed state in URL param "${this.dataproviderID}" — ignoring.`,
                    err
                );
                await this.load();
                return;
            }

            this.loadDataFromStorage(data);
            await this.load();
        }
    }
    return WithStatePersistence;
}
