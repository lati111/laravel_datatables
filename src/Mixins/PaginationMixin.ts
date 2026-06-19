/**
 * Mixin that adds pagination controls and page navigation to a dataprovider.
 */
import type {DataproviderCore} from "../DataproviderCore";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import type {Constructor} from "./types";

export function PaginationMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithPagination extends Base {
        /** Initializes pagination elements, navigation buttons, and per-page selector from DOM attributes. */
        protected initPagination() {
            const paginationElement = this.resolveElement('data-pagination-ID', '-pagination', '.pagination');
            if (paginationElement === null) {
                return;
            }

            const url = paginationElement.getAttribute('data-count-url');
            if (url === null) {
                throw new DatalistConstructionError('Pagination with ID "'+paginationElement.id+'" is missing attribute "data-count-url"', this.errorCallback)
            }

            this.pagination = paginationElement;
            this.pagecountUrl = url;
            this.pagecountUrlTemplate = url;

            //content init
            const contentID = paginationElement.getAttribute('data-content-ID')
            if (contentID !== null) {
                const contentElement = document.querySelector('#'+contentID);
                if (contentElement !== null) {
                    this.paginationContent = contentElement
                }
            }

            //previous page button init
            const prevBtnID = paginationElement.getAttribute('data-previous-page-button-ID')
            if (prevBtnID !== null) {
                const prevBtn = document.querySelector('#'+prevBtnID) as HTMLButtonElement|null;
                if (prevBtn !== null) {
                    prevBtn.addEventListener('click', this.pageChangeEvent.bind(this))
                    this.prevBtn = prevBtn
                }
            }

            //next page button init
            const nextBtnID = paginationElement.getAttribute('data-next-page-button-ID')
            if (nextBtnID !== null) {
                const nextBtn = document.querySelector('#'+nextBtnID) as HTMLButtonElement|null;
                if (nextBtn !== null) {
                    nextBtn.addEventListener('click', this.pageChangeEvent.bind(this))
                    this.nextBtn = nextBtn
                }
            }

            //per page selector init
            const perpageSelectorID = paginationElement.getAttribute('data-perpage-selector-ID')
            if (perpageSelectorID !== null) {
                const perpageSelector = document.querySelector('#'+perpageSelectorID) as HTMLSelectElement|null;
                if (perpageSelector !== null) {
                    perpageSelector.addEventListener('change', this.perPageChangeEvent.bind(this))
                    this.perpageSelector = perpageSelector

                    if (this.perpageSelector.value !== '') {
                        this.perpage = parseInt(perpageSelector.value);
                    }
                }
            }

            //page button cls
            this.pageBtnCls = paginationElement.getAttribute('data-page-cls')
            this.pageNumberedBtnCls = paginationElement.getAttribute('data-page-number-cls')
            this.pageBtnDividerCls = paginationElement.getAttribute('data-page-divider-cls')
            this.pageEmptyBtnCls = paginationElement.getAttribute('data-page-empty-cls')
            if (paginationElement.getAttribute('data-pages-in-pagination') !== null) {
                this.pagesInPagination = parseInt(paginationElement.getAttribute('data-pages-in-pagination')!)
            }
        }

        /** Fetches the total page count from the server and triggers a pagination render. */
        protected async fillPagination() {
            if (this.pagecountUrl === null || this.paginationContent === null) {
                return;
            }

            if (this.page === null) {
                this.page = 1;
            }

            const url = this.generateDataUrl(this.pagecountUrl).toString()

            this.pages = await this.fetchData(url) as number;

            this.renderPagination();
        }

        /** Renders the numbered page buttons, dividers, and navigation controls into the DOM. */
        protected renderPagination() {
            if (this.paginationContent === null || this.pages === null || this.page === null) {
                return;
            }

            const pages = this.pages;
            this.paginationContent.innerHTML = '';

            this.updateNavButton(this.prevBtn, this.page === 1);

            if (this.page > this.pagesInPagination + 1) { // show skip to first page
                this.paginationContent.append(this.createPaginationNode('1', 1))
                this.paginationContent.append(this.createPaginationDivider());
            } else { // show 2 more pages left
                for(let i = this.page - this.pagesInPagination; i < this.page - (this.pagesInPagination - 2); i++) {
                    if (i > 0) {
                        this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                    } else {
                        this.paginationContent.append(this.createEmptyPaginationNode());
                    }
                }
            }

            // show pages left of current page
            for(let i = this.page - (this.pagesInPagination - 2); i < this.page; i++) {
                if (i > 0) {
                    this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                } else {
                    this.paginationContent.append(this.createEmptyPaginationNode());
                }
            }

            // show current page
            this.paginationContent.append(this.createPaginationNode(this.page.toString(), this.page, true))

            // show pages right of current page
            for(let i = this.page + 1; i < this.page + (this.pagesInPagination - 1); i++) {
                if (i <= pages) {
                    this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                } else {
                    this.paginationContent.append(this.createEmptyPaginationNode());
                }
            }

            if (this.page < pages - this.pagesInPagination) { // show skip to final pages
                this.paginationContent.append(this.createPaginationDivider());
                this.paginationContent.append(this.createPaginationNode(pages.toString(), pages))
            } else { // show right 2 numbers
                for(let i = pages - 1; i < pages + 1; i++) {
                    if (i < pages - 2 && i > this.page) {
                        this.paginationContent.append(this.createPaginationNode(i.toString(), i))
                    } else {
                        this.paginationContent.append(this.createEmptyPaginationNode());
                    }
                }
            }

            this.updateNavButton(this.nextBtn, this.page === pages);
        }

        /** Creates a clickable pagination button for a specific page number. */
        protected createPaginationNode(text:string, page:number, current:boolean = false): HTMLButtonElement {
            const element = document.createElement('button');
            element.classList.value = `${this.pageBtnCls ?? ''} ${this.pageNumberedBtnCls ?? ''}`.trim();
            element.setAttribute('data-value', page.toString());
            element.textContent = text;
            if (current) {
                element.classList.add('active');
            }

            element.addEventListener('click', this.pageChangeEvent.bind(this))
            return element;
        }

        /** Creates a "..." divider span element between non-contiguous page ranges. */
        protected createPaginationDivider():HTMLSpanElement {
            const element = document.createElement('span');
            element.classList.value = `${this.pageBtnCls ?? ''} ${this.pageBtnDividerCls ?? ''}`.trim();
            element.textContent = '...';
            return element;
        }

        /** Creates an invisible placeholder button to maintain consistent pagination layout. */
        protected createEmptyPaginationNode():HTMLButtonElement {
            const element = document.createElement('button');
            element.classList.value = `${this.pageBtnCls ?? ''} ${this.pageEmptyBtnCls ?? ''}`.trim();
            return element;
        }

        /** Handles click events on page buttons and navigation arrows, then reloads data. */
        protected async pageChangeEvent(e:Event) {
            if (this.pagination === null || this.page === null || this.pages === null) {
                return;
            }

            const element = e.target as Element;
            let pageChanged = false;

            if (element === this.prevBtn && this.page > 1) {
                this.page -= 1;
                pageChanged = true;
            }


            if (element === this.nextBtn && this.page < this.pages) {
                this.page += 1;
                pageChanged = true;
            }


            const page = element.getAttribute('data-value');
            if (page !== null) {
                this.page = parseInt(page);
                pageChanged = true;
            }

            if (pageChanged) {
                await this.load()
            }
        }

        /** Handles changes to the per-page selector and reloads data with the new page size. */
        protected async perPageChangeEvent() {
            if (this.pagination === null || this.perpageSelector === null) {
                return;
            }

            this.perpage = parseInt(this.perpageSelector.value);

            await this.load()
        }

        private updateNavButton(button: HTMLButtonElement | null, shouldDisable: boolean): void {
            if (button === null) return;
            if (shouldDisable) button.setAttribute('disabled', 'disabled');
            else button.removeAttribute('disabled');
        }
    }
    return WithPagination;
}
