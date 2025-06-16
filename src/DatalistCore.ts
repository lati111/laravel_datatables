import {DatalistConstructionError} from "./Exceptions/DatalistConstructionError";
import {DatalistError} from "./Exceptions/DatalistError";
import {DataOperationsModule} from "./Modules/DataOperationsModule";

export abstract class DatalistCore {
    //| Core properties

    /** The core element for this datalist. */
    protected datalistElement: Element;

    /** The ID of this datalist, derived from the datalist element. */
    protected datalistID: string;

    /** An array containing the urls for the datalist */
    public urls: {[key: string]: string} = {};

    /** An array containing the settings for the datalist */
    public settings: {[key: string]: string|number|boolean} = {
        "history": true,
    }

    //| Event callbacks

    /** The event callback for whenever an error occurs. */
    public onErrorCallback: Function|null = null;

    //| Modules

    /** The module handling data operations. */
    public dataModule = new DataOperationsModule();

    //| Setup

    /**
     * Sets up the datalist properly.
     * @param dataprovider The dataprovider element of the ID of that element.
     */
    public constructor(dataprovider: Element|string) {
        // Setup dataprovider
        if (typeof dataprovider === 'string') {
            const dataproviderByID = document.querySelector('#'+dataprovider);
            if (dataproviderByID === null) {
                throw new DatalistConstructionError('No dataprovider found with the ID of '+dataprovider, this.onErrorCallback);
            }

            dataprovider = dataproviderByID;
        }

        this.datalistElement = dataprovider;
        if (this.datalistElement.id === "") {
            throw new DatalistConstructionError('No ID set on dataprovider', this.onErrorCallback);
        }

        this.datalistID = this.datalistElement.id;

        // Setup dataprovider information
        this.urls['data'] = this.datalistElement.getAttribute('data-url') ?? '-';
        if (this.datalistElement.getAttribute('data-url') === '-') {
            throw new DatalistConstructionError('No `data-url` set on dataprovider '+dataprovider, this.onErrorCallback);
        }

        this.urls['pages'] = this.datalistElement.getAttribute('data-url-pages') ?? this.urls['data']+'/pages';
    }

    //| Data

    public async dataLoad() {
        const data = await this.dataModule.getData(this.urls['data']);
        console.log(data);
    }

    //| Getters

    /**
     * Get the core datalist element of a datalist.
     */
    public getDatalistElement(): Element {
        return this.datalistElement;
    }
}