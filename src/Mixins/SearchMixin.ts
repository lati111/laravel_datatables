import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor} from "./types";

export function SearchMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithSearch extends Base {
        protected initSearchbar() {
            const searchbarElement = this.resolveElement('data-searchbar-ID', '-searchbar', '.searchbar');
            if (searchbarElement === null) {
                return;
            }

            this.searchbar = searchbarElement;
            const loadFunc = this.searchbarEvent.bind(this);

            //confirm button init
            const searchBtnID = searchbarElement.getAttribute('data-confirm-button-ID') ?? this.dataproviderID + '-search-confirm-button'
            const searchBtnElement = document.querySelector('#'+searchBtnID) as HTMLButtonElement|null;
            if (searchBtnElement !== null) {
                searchBtnElement.addEventListener('click', loadFunc)
                this.searchbarConfirmButton = searchBtnElement
            }

            //input init
            const searchInputID = searchbarElement.getAttribute('data-input-ID')
            if (searchInputID !== null) {
                let searchInputElement = document.querySelector('#'+searchInputID) as HTMLInputElement|null;
                if (searchInputElement === null) {
                    searchInputElement = this.searchbar as HTMLInputElement;
                }

                searchInputElement.addEventListener('keypress', loadFunc)
                this.searchbarInput = searchInputElement
            }
        }

        protected async searchbarEvent(e:Event) {
            if (e instanceof KeyboardEvent) {
                if (e.key !== "Enter") {
                    return;
                }
            }

            if (this.searchbarInput === null || this.loading) {
                return;
            }

            this.searchterm = this.searchbarInput.value;
            await this.load(true);
        }
    }
    return WithSearch;
}
