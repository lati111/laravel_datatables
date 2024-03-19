Laravel dataproviders readme
========================
Laravel dataprovider receivers is a collection of extendable scripts and templates designed to interact with the [Laravel dataproviders](https://github.com/lati111/laravel_dataproviders) composer package.

<!-- TOC -->
* [Laravel dataproviders readme](#laravel-dataproviders-readme)
  * [Usage](#usage)
    * [Using a dataprovider](#using-a-dataprovider)
      * [Using dynamic urls](#using-dynamic-urls)
      * [Using filtering](#using-filtering)
    * [Creating a custom dataprovider script (TS)](#creating-a-custom-dataprovider-script-ts)
      * [Adding new functions](#adding-new-functions)
    * [Creating a dataprovider in HTML](#creating-a-dataprovider-in-html)
      * [Creating a searchbar](#creating-a-searchbar)
      * [Creating the pagination](#creating-the-pagination)
      * [Creating a load indicator](#creating-a-load-indicator)
  * [Templates](#templates)
    * [Datatable](#datatable)
      * [Creating a datatable](#creating-a-datatable)
        * [Creating datatable columns](#creating-datatable-columns)
    * [Datatable selector](#datatable-selector)
      * [Creating a datatable selector](#creating-a-datatable-selector)
      * [Using a datatable selector](#using-a-datatable-selector)
        * [Events](#events)
    * [Dataselect](#dataselect)
      * [Creating a dataselect](#creating-a-dataselect)
  * [Requirements](#requirements)
<!-- TOC -->

## Usage
To allow for greater variety when it comes to actually creating your datatable, it is recommended you use your own version of this script, extending `DataproviderBase` with your own implementation. If you would rather use an out of the box solution, `Datatable` is available as both an example and fully functional version of this script.

### Using a dataprovider
A dataprovider can be initialized by creating the class of the dataprovider (including passing either the dataprovider's ID, or the element itself) in either javascript or typescript, and calling it's init function. From there on out it will initialize itself as intended.

```ts
    datatable = new Datatable('overview')
    await datatable.init();
```

#### Using dynamic urls
Dataproviders are by default capable of swapping out the url at will, in case you need to change what data is being loaded. To do this, the dataprovider must have the `data-dynamic-url` attribute set to `true`. If this is the case, you can call the `modifyUrl` to modify the various urls originally given to the dataprovider. When enabled, the datatable will not load until the urls are modified for the first time

```ts
    const replacers = {"[user_id]": "42"} //The key, in this case '[user_id]', will be searched for in all url strings, and be replaced with the value
    await datatable.modifyUrl(replacers)
```

In this example, the url `https://site.test/users/[user_id]/data` would become `https://site.test/users/42/data`

#### Using filtering
The dataproviders also contain a dynamic filtering system, and support for that has been built into the receivers as well. You may add your own filters by implementing them through `getFilters()`. By default the option for filter checkboxes is also built in. If a checkbox has the `{dataproviderID}-filter-checkbox` class, where dataproviderID is the ID of the dataprovider, it will be automatically added as a filter. The `name` attribute must match the name of the filter you want to use. To declare what should be filtered on, you can add the following attributes:
- `data-checked-operator`: The operator to pass to the filter when this element is checked, as declared in the filter.
- `data-checked-value`: The value to filter on passed to the filter when this element is checked.
- `data-unchecked-operator`: The operator to pass to the filter when this element is unchecked, as declared in the filter.
- `data-unchecked-value`: The value to filter on passed to the filter when this element is unchecked.

### Creating a custom dataprovider script (TS)
Start creating your own receiver class for a dataprovider, simply create a class extending `DataproviderBase`. Afterwards you must implement it's abstract methods.
The first being `abstract fetchData(url: string): Promise<any>`, which should retrieve the json data from your dataprovider and convert it into an array filled with associative arrays.
The second method is `abstract addItem(data:Array<any>): void` which should add one of the associative arrays from `fetchData` to your datatable in whatever way you want.

```ts
class Datatable extends DataproviderBase {
    async fetchData(url: string): Promise<any> {
        const response = await fetch(url, {
            method: 'get',
            headers: {
                'Accept': 'application/json',
                "Sec-Fetch-Site": "same-origin"
            }
        });
    
        const data = await response.json();
        return data as Array<Array<any>>;
    }

    addItem(data:Array<any>): void {
        const row = document.createElement('tr');
        let key: keyof typeof data;
        for (key in data) {
            const td = document.createElement('td');
            td.innerHTML = data[key];
            row.append(td);
        }

        // Always append to this.body, as that is always where the content should go.
        this.body.append(row);
    }
}
```

You can then initialize the dataprovider by creating an instance of your newly created class, and initializing it.

```ts
async function init() {
    const dataproviders = document.querySelectorAll('.dataprovider');
    for (let i = 0; i < dataproviders.length; i++) {
        const datatable = new Datatable(dataproviders[i])
        await datatable.init();
    }
}
```

#### Adding new functions

If you want to add new functions to your dataprovider, such as support for sortable columns headers, you can start by creating the methods and properties to perform those functions.

```ts
class Datatable extends DataproviderBase {
    protected sortableHeaders:NodeListOf<Element>;

    private sortNeutralImagePath = 'img/icons/sort.svg';
    private sortDescendingImagePath = 'img/icons/arrow-down.svg';
    private sortAscendingImagePath = 'img/icons/arrow-up.svg';

    /**
     * Toggle a header element to it's next mode from neutral -> desc -> asc -> neutral...
     * @param {Element} header The header element
     * @return void
     */
    public toggleSortableHeader(header:Element) {
        let sortdir = header.getAttribute('data-sort-dir');
        const img = header.querySelector('img.sort-image') as HTMLImageElement|null;
        if (img === null) {
            throw new Error("Sort image undefined on header");
        }

        switch (sortdir) {
            case 'neutral':
                this.setSortableHeader(header, 'desc');
                break;
            case 'desc':
                this.setSortableHeader(header, 'asc');
                break;
            case 'asc':
            default:
                this.setSortableHeader(header, 'neutral');
                break;
        }

        this.load(true);
    }

    /**
     * Set a sortable header's direction
     * @param {Element} header The header element
     * @param {string} sortdir The direction to sort it (can be neutral, desc or asc)
     * @return void
     */
    public setSortableHeader(header:Element, sortdir:string) {
        const img = header.querySelector('img.sort-image') as HTMLImageElement|null;

        switch (sortdir) {
            case 'neutral':
                if (img !== null) {
                    img.src = this.sortNeutralImagePath;
                }
                break;
            case 'desc':
                if (img !== null) {
                    img.src = this.sortDescendingImagePath;
                }
                break;
            case 'asc':
                if (img !== null) {
                    img.src = this.sortAscendingImagePath;
                }
                break;
        }

        header.setAttribute('data-sort-dir', sortdir);
    }
}
```

After creating your new functions, you should implement them during initialization by extending the `setup` method.

```ts
    protected setup(): void {
        super.setup();

        // sortable headers
        this.sortableHeaders = this.dataprovider.querySelectorAll('thead th.datatable-header[data-sortable="true"]');
        for (const header of this.sortableHeaders) {
            const boundFunc = this.toggleSortableHeader.bind(this, header)
            header.addEventListener('click', boundFunc);
        }
    }
```

Then you need to make sure your new methods are added to the query parameters when loading new data by extending the `generateDataUrl` method.

```ts
    /**
     * Gets the sort data as an associative array
     * @return {array} Sort data as associative array
     */
    protected getSortData():{[key:string]: string} {
        const array:{[key:string]: string} = {};
        if (this.sortableHeaders === null) {
            return array;
        }

        for (let i = 0; i < this.sortableHeaders.length; i++) {
            const header = this.sortableHeaders[i] as Element;
            const column = header.getAttribute(('data-sort-column'));
            if (column === null) {
                continue;
            }

            const direction = header.getAttribute(('data-sort-dir'));
            if (direction === 'asc' || direction === 'desc') {
                array[column] = direction;
            }
        }

        return array;
    }

    protected generateDataUrl(baseUrl:string = this.url):URL {
        const url = super.generateDataUrl(baseUrl);

        const sortData = this.getSortData();
        if (Object.keys(sortData).length > 0) {
            url.searchParams.set('sort', JSON.stringify(sortData))
        }

        return url;
    }
```

Lastly you need to ensure that your new query parameters persist during operations by extending `getStorableData` to save your query parameters and `loadDataFromStorage` to load them back in when needed.

```ts
    protected getStorableData():{[key: string]: any} {
        const data = super.getStorableData();
        const sortData = this.getSortData();
        if (Object.keys(sortData).length > 0) {
            data.sort = JSON.stringify(sortData);
        }

        return data;
    }

    protected loadDataFromStorage(data:{[key:string]: any}):void {
        super.loadDataFromStorage(data);

        if (this.sortableHeaders !== null && data.sort !== undefined) {
            const sorts = JSON.parse(data.sort);

            for (let i = 0; i < this.sortableHeaders.length; i++) {
                const header = this.sortableHeaders[i] as Element;
                const column = header.getAttribute(('data-sort-column'));
                if (column === null) {
                    continue;
                }

                if (sorts[column] !== undefined) {
                    this.setSortableHeader(header, sorts[column]);
                }
            }
        }
    }
```

### Creating a dataprovider in HTML
To create a datatable you must create an element with an ID of your choice, hereby referred to as the dataproviderID. This element must be given the `dataprovider` class and a `data-content-url` attribute containing the url to the dataprovider on your backend.

Furthermore, a number of optional attributes can be set for additional customization:
- `data-content-ID`: The ID of where the content should be placed. If left empty, the dataproviderID itself will be used
- `data-spinner-ID`: The ID of the spinner that should be shown while loading. If left empty, no spinner will be used
- `data-pagination-ID`: The ID of your pagination element. If left empty, `[dataproviderID]-pagination` will be used for the ID.
- `data-searchbar-ID`: The ID of your searchbar element. If left empty, `[dataproviderID]-searchbar` will be used for the ID.
- `data-empty-body`: A HTML string that should be inserted into the body if the amount of records in the dataprovider is 0, empty by default.
- `data-history`: Whether or not to track the dataprovider's history or not. True by default.

```html
    <table
        id="datatable1"
        data-content-url="https://site.test/datatable1"
        data-content-ID="datatable1-content"
        data-spinner-ID="datatable1-spinner"
        data-pagination-ID="datatable1-pagination"
        data-searchbar-ID="datatable1-searchbar"
        data-empty-body="<tr><td colspan='99' class='text-center'>No results</td></tr>"
        class="table dataprovider datatable">
        
        <thead>
            <tr>
                <td>column1</td>
                <td>column2</td>
                <td>column3</td>
            </tr>
        </thead>
        
        <tbody id="datatable1-content" class="hidden"></tbody>
        
        <div id="datatable1-spinner" class="spinner">
            <img src="/img/icons/spinner.svg" class="animate-spin">
        </div>
    </table>
```

#### Creating a searchbar
The searchbar can be used to input a searchterm to be searched in the columns defined in the backend for this dataprovider. A searchbar must use the `searchbar` class to be used. Furthermore, a number of optional attributes can be added for further customization:
- `data-confirm-button-ID`: The ID of a button which can be pressed to activate a search event.
- `data-input-ID`: The ID of the actual input for the searchbar. When not set the ID of the searchbar is used.

```html
    <div id="datatable1-searchbar" class="searchbar" 
        data-confirm-button-ID="datatable1-confirm-button" data-input-ID="datatable1-searchbar-input">
        
        <input id="datatable1-searchbar-input" type="text"  placeholder="Search..." >
        
        <button id="datatable1-confirm-button">
            <img src="img/icons/search.svg">
        </button>
    </div>
```

#### Creating the pagination
The pagination is the place where the page numbers will be added to to navigate between pages. It must have the `pagination` class and a `data-count-url` attribute containing the url to obtain the `getCount()` method from a dataprovider with the `Paginatable` trait. There are also a number of optional attributes for additional customization options:
- `data-content-ID`: The ID of where the content should be placed. If left empty, the pagination itself will be used.
- `data-perpage-selector-ID`: The ID of a perpage selector. If left empty, no per page selector will be used. Must be a select element.
- `data-previous-page-button-ID`: The ID of a of the button that should navigate to the previous page, if left empty no such button will exist.
- `data-next-page-button-ID`: The ID of a of the button that should navigate to the next page, if left empty no such button will exist.
- `data-pages-in-pagination`: The amount of pages in pagination. This determines how many page button will be to the left and right of the current page button in the pagination. (the total amount will thus be this amount times 2 plus 1). 7 by default.
- `data-page-cls`: The classes that will be assigned to all page elements.
- `data-page-number-cls`: The classes that will be assigned to all numbered page elements.
- `data-page-divider-cls`: The classes that will be assigned to all page divider elements.
- `data-page-empty-cls`: The classes that will be assigned to all empty page elements.

```html
<div id="datatable1-pagination" class="pagination" data-count-url="https://site.test/datatable1/count"
    data-previous-page-button-ID="datatable1-pagination-prev" data-next-page-button-ID="datatable1-pagination-next"
    data-content-ID="datatable1-pagination-content" data-perpage-selector-ID="datatable1-perpage-selector">
    
    <button id="datatable1-pagination-prev">previous</button>
    <div id="datatable1-pagination-content"></div>
    <button id="datatable1-pagination-next">next</button>
</div>

<div >
    <label>
        <span>Per page: </span>
        <select id="datatable1-perpage-selector" name="perpage">
            <option value="5">5</option>
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
        </select>
    </label>
</div>

```

#### Creating a load indicator
To give the dataprovider a smoother feeling while loading, you can add a load indicator by adding it's ID to the `data-spinner-ID` attribute on the dataprovider. When set every time loading occurs the load indicator is shown instead of the body. The load indicator can also be customized by adding one of the below attributes.
- `data-hide-body`: Indicates that the body should be hidden during loading. When set to false the load indicator AND the body are visible. False by default.

## Templates
This package comes with a number of pre-defined implementations you can use if they suit your purposes.

### Datatable
The `Datatable` is a dataprovider implemented in a standard HTML table. It mostly centers around using columns to define the table cells as well as provide sorting. That aside, it is a mostly standard table without many bells and whistles.

#### Creating a datatable
You can create a datatable just like creating any dataprovider through TypeScript. As for the HTML implementation, simply create a table dataprovider. The datatable format also has a number of attributes for further customization that can be added. Below follows a list.
- `data-sort-img-neutral`: The path to the neutral sorting image. If not set no icon will be displayed.
- `data-sort-img-asc`: The path to the ascending sorting image. If not set no icon will be displayed.
- `data-sort-img-desc`: The path to the descending sorting image. If not set no icon will be displayed.

```html
<div class="border border-tertiary-blue border-solid w-full">
    <table
        id="datatable1"
        data-content-url="https://dummy.site/datatable1"
        data-pagination-ID="datatable1-pagination"
        data-searchbar-ID="datatable1-searchbar"
        data-sort-img-neutral="img/icons/sort.svg"
        data-sort-img-asc="img/icons/sort-asc.svg"
        data-sort-img-desc="img/icons/sort-desc.svg"
        data-empty-body="<tr><td colspan='99' class='text-center'>No results</td></tr>"
        class="table dataprovider datatable">
        
        <thead>
            <tr></tr>
        </thead>
        
        <tbody id="datatable1-content" class="hidden">
        </tbody>
    </table>

    <div id="datatable1-spinner" class="spinner">
        <img src="/img/icons/spinner.svg" class="animate-spin" alt="loading">
    </div>
</div>
```
##### Creating datatable columns

The actual customization of the table comes in the form of columns, defined in the `<tr>` contained in the `<thead>`. A column can have the `datatable-hearer` class and the `data-column` attribute set to whatever the column name is as passed by the Laravel Dataprovider. If sorting is enabled, it is required to put an `<img>` element in the `<th>` with the `sort-image` class, in which the sort icon will be displayed.

Furthermore, a column can have a range of optional attributes for futher customization. That list is as follows:
- `data-visible`: Whether or not this column and it's cells should be visible. True by default.
- `data-sortable`: If this column can be sorted or not. False by default.
- `data-sort-dir`: What direction this column is sorting in. Neutral by default.
- `data-format`: A HTML string that will be placed in this column's cells. The text `[value]` will be replaced with the actual value on input.
- `data-default`: A default value for the column if no value is given. By default none.

```html
<th class="datatable-header"
    data-column="messages"
    data-format="<span>[value] messages</span>"
    data-sortable="true"
    data-sort-dir="neutral"
    data-default="0"
    data-visible="true">

    <div>
        <span>Messages</span>
        <span>
            <img class="sort-image" src="img/icons/sort.svg" alt="neutral sort icon">
        </span>
    </div>
</th>
```

### Datatable selector
The `DatatableSelector` is a variant of the `Datatable` class that functions identically for the most part, with a single addition. The `DatatableSelector` is designed to selected multiple entries in the datatable across several pages and pool them in a single result. It does so by adding checkboxes in front of every single entry.

#### Creating a datatable selector
A `DatatableSelector` is mostly created like it's parent class `Datatable`, with a few minor changes. Specifically the creation of a container to display selected items in, and a few attributes to make the selecting work. On the `Datatable` element add the `datatable-selector` class and fill in the `data-selector-list-ID` attribute with the ID of the select list container.

The select list has the following attributes:
- `data-selection-url`: The url which to preload selected items from. When unset does not preload items.
- `data-item-identifier`: The column name that has the identifier for this item, usually id or uuid. Is required.
- `data-item-label`: The column name that has the displayed name for this item, by default equal to the identifier.
- `data-checkbox-header-cls`: Additional classes for the checkbox header.
- `data-item-cls`: Additional classes to be added to the display element.
- `data-item-label-cls`: Additional classes to be added to the display element's label.
- `data-item-close-button-cls`: Additional classes to be added to the display element's close button.
- `data-item-close-button-content`: What is displayed inside the close button. Normally `<span>X</span>`.
- `data-readonly`: Whether this selector is readonly or not. False by default.


```html
<div class="flex flex-col justify-center align-items max-w-xl gap-4">
    <h4 class="text-center font-bold text-lg w-full">Allowed locations</h4>
    <div id="datatable-selector1-select-list"
         data-item-cls="border"
         data-item-identifier="id"
         data-item-label="location"
    </div>

    <table id="datatable-selector1" class="datatable datatable-selector" 
        data-selector-list-ID="datatable-selector1-select-list">
    ...
    </table>
</div>
```

#### Using a datatable selector
After a datatable selector has been intialized, you can get an array of identifiers belonging to each selected item by calling the `getSelectedItems` method.

```ts
    console.log(datatableSelector.getSelectedItems())
```

##### Events
The datatable selector class has a number of events that can be used for greater flexibility of use. Below follows a list of them, their trigger condition and their given parameters.

- `onSelectEvent`: Triggers when an item is selected. Passes the datatable selector instance and the identifier of the added item.
- `onSelectEvent`: Triggers when an item is deselected or removed. Passes the datatable selector instance and the identifier of the added item.

```ts
    function logSelecting(datatableSelector, id) {
        console.log(id)
    }

    datatableSelector.onSelectEvent = logSelecting;
```

### Dataselect
The dataselect dataprovider is a select element that dynamically loads from a dataprovider. Unlike a datatable selector it can only select a single item. While the searchbar for this item is made the same way, it behaves differently. Specifically it serves as the visible part that would normally be the select element itself, and upon closing the option list resets to the newly chosen option, or the last chosen one. The option list also automatically closes when clicking anywhere but the option list. It also has pagination built in, activated on scrolling to the bottom, and thus can use pagination attributes like `data-per-page`.

#### Creating a dataselect
A data select does not actually contain a `<select>` element, rather it has a hidden input statement, a body that is shown when the 'select' is opened, and a searchbar. There are also a number of attributes to modify the entire selector further.
- `data-item-identifier`: The column name that has the identifier for this item, usually id or uuid. Is required.
- `data-item-label`: The column name that has the displayed name for this item, by default equal to the identifier.
- `data-expand-button`: The button shown when the option list is closed. When clicked opens the option list. Is required.
- `data-collapse-button`: The button shown when the option list is open. When clicked closes the option list. Is required.
- `data-option-cls`: The cls given to any option created by the `generateItem()` method.
- `data-option-content-cls`: The cls given to any option's content field created by the `generateItem()` method.

```html
<div>
  <input
          id="dataselect1"
          name="user"
          type="hidden"
          ...
          data-expand-button-id="dataselect1-expand-button"
          data-collapse-button-id="dataselect1-collapse-button"
          data-searchbar-ID="dataselect1-searchbar"
          data-item-identifier="uuid"
          data-item-label="name"
          class="dataprovider"
  />

  <input id="dataselect1-searchbar" class="searchbar" placeholder="Pick a user" autocomplete="off">

  <label class="cursor-pointer outline-none focus:outline-none border-l border-gray-200 transition-all px-1">
    <button id="dataselect1-expand-button"><img src="img/icons/show-more.svg" alt="show more"></button>
    <button id="dataselect1-collapse-button"><img src="img/icons/show-less.svg" alt="show less"></button>
  </label>

  <div id="dataselect1-content"></div>
</div>
```

## Requirements
- An accessible API with a [Laravel dataprovider](https://github.com/lati111/laravel_dataproviders)
- TypeScript >= 5.3