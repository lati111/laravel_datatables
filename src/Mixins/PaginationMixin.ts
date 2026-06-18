import type {DataproviderCore} from "../DataproviderCore";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import type {Constructor} from "./types";

export function PaginationMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithPagination extends Base {
        protected initPagination() {
            let paginationID = this.dataprovider.getAttribute('data-pagination-ID');
            if (paginationID === null) {
                paginationID = this.dataproviderID + '-pagination';
            }

            const paginationElement = document.querySelector('#' + paginationID + '.pagination')
            if (paginationElement === null) {
                return;
            }

            const url = paginationElement.getAttribute('data-count-url');
            if (url === null) {
                throw new DatalistConstructionError('Pagination with ID "'+paginationID+'" is missing attribute "data-count-url"', this.errorCallback)
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

        protected async fillPagination() {
            if (this.pagecountUrl === null || this.paginationContent === null) {
                return;
            }

            if (this.page === null) {
                this.page = 1;
            }

            const url = this.generateDataUrl(this.pagecountUrl).toString()

            const pages = await this.fetchData(url) as number;
            this.pages = pages;

            this.renderPagination();
        }

        protected renderPagination() {
            if (this.paginationContent === null || this.pages === null || this.page === null) {
                return;
            }

            const pages = this.pages;
            this.paginationContent.innerHTML = '';

            // show previous button
            if (this.prevBtn !== null) {
                if (this.prevBtn.hasAttribute('disabled') && this.page !== 1) {
                    this.prevBtn.removeAttribute('disabled')
                } else if (this.page === 1) {
                    this.prevBtn.setAttribute('disabled', 'disabled')
                }
            }

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

            // show next button
            if (this.nextBtn !== null) {
                if (this.nextBtn.hasAttribute('disabled') && this.page !== pages) {
                    this.nextBtn.removeAttribute('disabled')
                } else if (this.page === pages) {
                    this.nextBtn.setAttribute('disabled', 'disabled')
                }
            }
        }

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

        protected createPaginationDivider():HTMLSpanElement {
            const element = document.createElement('span');
            element.classList.value = `${this.pageBtnCls ?? ''} ${this.pageBtnDividerCls ?? ''}`.trim();
            element.textContent = '...';
            return element;
        }

        protected createEmptyPaginationNode():HTMLButtonElement {
            const element = document.createElement('button');
            element.classList.value = `${this.pageBtnCls ?? ''} ${this.pageEmptyBtnCls ?? ''}`.trim();
            return element;
        }

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

        protected async perPageChangeEvent() {
            if (this.pagination === null || this.perpageSelector === null) {
                return;
            }

            this.perpage = parseInt(this.perpageSelector.value);

            await this.load()
        }
    }
    return WithPagination;
}
