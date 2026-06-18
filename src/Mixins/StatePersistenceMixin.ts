import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor} from "./types";

export function StatePersistenceMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithStatePersistence extends Base {
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

            this.loadStoredFilterData(data);
            this.normalizeFilterCheckboxes(data);
        }

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

        protected loadStoredFilterData(data:{[key:string]: any}): void {
            if (typeof data.filters === 'object') {
                for (const key in data.filters) {
                    const filter = data.filters[key] as {[key:string]:string};
                    this.performLoadStoredFilterData(filter);
                }
            }
        }

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
    }
    return WithStatePersistence;
}
