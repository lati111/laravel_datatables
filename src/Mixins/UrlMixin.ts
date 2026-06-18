import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor} from "./types";

export function UrlMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithUrl extends Base {
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

            if (Object.keys(this.customSelectProperties).length > 0) {
                let columnString = '';
                for (let i = 0; i < Object.keys(this.customSelectProperties).length; i++) {
                    const column = Object.keys(this.customSelectProperties)[i];
                    const value = this.customSelectProperties[column];
                    columnString += (i === 0 ? '' : ',')+`${column}=`+(value ? '1' : '0');
                }

                url.searchParams.set('columns', columnString);
            }

            return url;
        }

        public async modifyUrl(replacers:{[key:string]:string}) {
            this.blockLoading = false;
            await this.changeUrls(replacers);

            await this.load(true);
        }

        protected async changeUrls(replacers:{[key:string]:string}): Promise<void> {
            this.url = this.changeUrl(this.urlTemplate, replacers);
            if (this.pagecountUrl !== null) {
                this.pagecountUrl = this.changeUrl(this.pagecountUrlTemplate!, replacers);
            }
        }

        protected changeUrl(url:string, replacers:{[key:string]:string}): string {
            let key: keyof typeof replacers;
            for (key in replacers) {
                url = url.replace(key, replacers[key])
            }

            return url;
        }

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
