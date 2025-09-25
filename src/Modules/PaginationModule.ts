import {DataOperationsModule} from "./DataOperationsModule";
import {DatalistCore} from "../DatalistCore";

export class PaginationModule {
    protected datalist: DatalistCore
    public constructor(datalist: DatalistCore) {
        this.datalist = datalist;
    }

    public page: number = 1;
    protected maxPages: number = 0;

    protected paginationElement: HTMLElement|null = null;

    public setPaginationElement(paginationElement: HTMLElement) {
        this.paginationElement = paginationElement;
        this.initializePaginationElement();
    }

    public createPaginationElement(container: HTMLElement) {
        const div = document.createElement('div');
        div.id = 'datalist-pagination';
        container.append(div)

        this.paginationElement = div;
        this.initializePaginationElement()
    }

    protected initializePaginationElement() {
        const leftMostNavigator = document.createElement('button');
        leftMostNavigator.id = 'leftmost_navigator';
        leftMostNavigator.addEventListener('click', this.paginateTo.bind(this, 1, false));
        leftMostNavigator.classList.add('pagination-node');
        leftMostNavigator.textContent = '<<';

        const leftNavigator = document.createElement('button');
        leftNavigator.id = 'left_navigator';
        leftNavigator.addEventListener('click', this.paginateTo.bind(this, -1, true));
        leftNavigator.classList.add('pagination-node');
        leftNavigator.textContent = '<';


        const innerPaginationContainer = document.createElement('span');
        innerPaginationContainer.id = 'datalist-pagination-pages'


        const rightNavigator = document.createElement('button');
        rightNavigator.id = 'right_navigator';
        rightNavigator.addEventListener('click', this.paginateTo.bind(this, 1, true));
        rightNavigator.classList.add('pagination-node');
        rightNavigator.textContent = '>';

        const rightMostNavigator = document.createElement('button');
        rightMostNavigator.id = 'rightmost_navigator';
        rightMostNavigator.addEventListener('click', this.paginateTo.bind(this, -99, false));
        rightMostNavigator.classList.add('pagination-node');
        rightMostNavigator.textContent = '>>';

        this.paginationElement?.prepend(leftNavigator)
        this.paginationElement?.prepend(leftMostNavigator);
        this.paginationElement?.append(innerPaginationContainer);
        this.paginationElement?.append(rightNavigator);
        this.paginationElement?.append(rightMostNavigator);
    }

    public async drawPagination(dataModule: DataOperationsModule, url: string, paginationSize: number): Promise<any> {
        this.maxPages = await dataModule.getData(url+'/pages');
        const innerContainer = this.paginationElement?.querySelector('#datalist-pagination-pages') as HTMLElement;
        innerContainer.innerHTML = '';

        // Set navigator button status
        if (this.page === 1) {
            this.paginationElement?.querySelector('#leftmost_navigator')?.setAttribute('disabled', 'disabled');
            this.paginationElement?.querySelector('#left_navigator')?.setAttribute('disabled', 'disabled');
        } else {
            this.paginationElement?.querySelector('#leftmost_navigator')?.removeAttribute('disabled');
            this.paginationElement?.querySelector('#left_navigator')?.removeAttribute('disabled');
        }

        if (this.page === this.maxPages) {
            this.paginationElement?.querySelector('#rightmost_navigator')?.setAttribute('disabled', 'disabled');
            this.paginationElement?.querySelector('#right_navigator')?.setAttribute('disabled', 'disabled');
        } else {
            this.paginationElement?.querySelector('#rightmost_navigator')?.removeAttribute('disabled');
            this.paginationElement?.querySelector('#right_navigator')?.removeAttribute('disabled');
        }

        innerContainer.append(this.drawPaginationNode(this.page));

        for (let i = 1; i <= paginationSize; i++) {
            if (this.page - i >= 1) {
                innerContainer.prepend(this.drawPaginationNode(this.page - i));
            } else {
                const padding = document.createElement('span');
                padding.classList.add('pagination-node');
                innerContainer.prepend(padding);
            }

            if (this.page + i <= this.maxPages) {
                innerContainer.append(this.drawPaginationNode(this.page + i));
            } else {
                const padding = document.createElement('span');
                padding.classList.add('pagination-node');
                innerContainer.append(padding);
            }
        }
    }

    protected drawPaginationNode(page: number) {
        const button = document.createElement('button');
        button.addEventListener('click', this.paginateTo.bind(this, page, false));
        button.classList.add('pagination-node');
        button.textContent = page.toString();

        return button
    }

    async paginateTo(page: number, addMode: boolean = false) {
        if (page === -99) {
            page = this.maxPages;
        }

        if (addMode) {
            this.page = this.page + page;
        } else {
            this.page = page;
        }

        await this.datalist?.dataLoad();
    }
}