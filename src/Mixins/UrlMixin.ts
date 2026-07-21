/**
 * Mixin that handles URL construction and manipulation for dataprovider API requests, including pagination, search, filter, and column selection parameters.
 * @module UrlMixin
 */
import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor} from "./types";

export function UrlMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithUrl extends Base {
        /** Builds a complete API request URL with pagination, search, filter, and column parameters. */
        public generateDataUrl(baseUrl:string = this.url):URL {
            let url = new URL(baseUrl);

            url.searchParams.set('schema', '3');

            if (this.pagination !== null) {
                url.searchParams.set('page', (this.page ?? 1).toString());
                url.searchParams.set('perpage', (this.perpage ?? 10).toString());
            }

            if (this.searchbar !== null && this.searchterm !== null  && this.searchterm !== '') {
                url.searchParams.set('search', this.searchterm);
            }

            const filterData = this.getStorableFilterData();
            if (filterData !== null) {
                url.searchParams.set('filters', JSON.stringify(filterData));
            }

            const columnKeys = Object.keys(this.customSelectProperties);
            if (columnKeys.length > 0) {
                // Encode each column name to survive commas/equals/whitespace in identifiers.
                const columnString = columnKeys
                    .map(column => `${encodeURIComponent(column)}=${this.customSelectProperties[column] ? '1' : '0'}`)
                    .join(',');
                url.searchParams.set('columns', columnString);
            }

            return url;
        }

        /** Applies URL placeholder replacements and triggers a fresh data load. */
        public async modifyUrl(replacers:{[key:string]:string}) {
            this.blockLoading = false;
            await this.changeUrls(replacers);

            await this.load(true);
        }

        /** Applies placeholder replacements to both the data URL and page count URL. */
        protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
            this.url = this.changeUrl(this.urlTemplate, replacers);
            if (this.pagecountUrl !== null) {
                this.pagecountUrl = this.changeUrl(this.pagecountUrlTemplate!, replacers);
            }
        }

        /** Replaces placeholder tokens in a URL string with the provided values. Replaces all occurrences. */
        protected changeUrl(url:string, replacers:{[key:string]:string}): string {
            let key: keyof typeof replacers;
            for (key in replacers) {
                url = url.split(key).join(replacers[key]);
            }

            return url;
        }

        /** Toggles a custom column's visibility in API requests, or removes the override when set to null. */
        public setCustomSelect(column: string, show: boolean|null) {
            if (column in this.customSelectProperties) {
                delete this.customSelectProperties[column];
            }

            if (show !== null) {
                this.customSelectProperties[column] = show;
            }
        }
    }
    return WithUrl;
}
