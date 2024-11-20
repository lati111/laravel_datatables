import {DataproviderBase} from "../DataproviderBase";
import {AbstractDataproviderTemplate} from "./AbstractDataproviderTemplate";
import {DataSelect} from "./Select/Dataselect";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import {Filter} from "../Data/Filter";

export abstract class AbstractDatalistTemplate extends AbstractDataproviderTemplate {
    //| Filter properties

    /** @type {DataSelect|null} The dataselect for values in the filter form */
    protected valueDataSelect: DataSelect | null = null;

    /** @type {Element|null} The container for the dataselect */
    protected valueDataSelectContainer: HTMLElement | null = null;

    /** @type {Array} An associative array containing the filter dataselects using the IDs as keys*/
    public filterDataSelects:{[key:string]:DataSelect} = {};


    //| Setup
    /** @inheritDoc */
    protected async filterInit(): Promise<void> {
        //init filterform dataselect
        if (this.valueDataSelect !== null) {
            await this.valueDataSelect.init();
        }

        //init filter dataselects
        const filterDataSelectKeys = Object.keys(this.filterDataSelects);
        for (let i = 0; i < filterDataSelectKeys.length; i++) {
            const dataselect = this.filterDataSelects[filterDataSelectKeys[i]] as DataSelect;
            dataselect.onItemSelectEvent = this.load.bind(this, true, false);
            dataselect.onClearEvent = this.load.bind(this, true, false);
            await dataselect.init();
        }

        //init base filters
        await super.filterInit();
    }

    /** @inheritDoc */
    protected filterSetup(): void {
        super.filterSetup();

        //setup filter form dataselect
        if (this.filterForm !== null) {
            const valueSelect = this.filterForm.querySelector('.dataselect-container [name="dataselect"]');
            if (valueSelect !== null) {
                if (valueSelect.id === null) {
                    valueSelect.id = this.dataproviderID + '-value-dataselect';
                }

                this.valueDataSelect = new DataSelect(valueSelect.id)
                this.valueDataSelectContainer = this.filterForm.querySelector('.dataselect-container');
            }
        }

        //setup datafilterselects
        const datafilterselects = document.querySelectorAll(`.${this.dataproviderID}-data-filter-select[data-filter-operator]`);
        for (const datafilterselect of datafilterselects) {
            this.filterDataSelects[datafilterselect.id] = new DataSelect(datafilterselect.id);
        }
    }


    //| DOM manipulation

    /** @inheritDoc */
    protected resetFilterSelects() {
        super.resetFilterSelects();

        if (this.filterSelect === null) {
            return;
        }

        if (this.valueDataSelect !== null) {
            this.valueDataSelectContainer!.classList.add('hidden');
            this.valueDataSelectContainer!.style.order = '3'
        }
    }


    //| Filter methods

    /** @inheritDoc */
    protected performLoadStoredFilterData(filter:{[key:string]:string}) {
        if (filter['type'] === 'dataselect') {
            const filterDataSelectKeys = Object.keys(this.filterDataSelects);
            for (let i = 0; i < filterDataSelectKeys.length; i++) {
                const dataselect = this.filterDataSelects[filterDataSelectKeys[i]] as DataSelect;
                if ((dataselect.dataprovider as HTMLInputElement).name === filter['filter']) {
                    dataselect.setSelectedItem(filter['value'], filter['display'])
                }
            }
        }
    }

    /** @inheritDoc */
    protected getFilters(): Array<Filter>{
        const filters: Array<Filter> = super.getFilters();

        //Get data filter selects
        const filterDataSelectKeys = Object.keys(this.filterDataSelects);
        for (let i = 0; i < filterDataSelectKeys.length; i++) {
            const dataselect = this.filterDataSelects[filterDataSelectKeys[i]] as DataSelect;
            const filter = (dataselect.dataprovider as HTMLInputElement).name;
            const operator = dataselect.dataprovider.getAttribute('data-filter-operator')!;
            const value = dataselect.getSelectedItem();
            const label = dataselect.getSelectedLabel();

            if (value !== '') {
                filters.push(new Filter('dataselect', filter, operator, value, label));
            }
        }

        return filters;
    }


    //| Filter events
    protected async performOnfilterSelect(data: { [key: string]: any }) {
        await super.performOnfilterSelect(data);

        if (data['type'] === 'data-select') {
            if (this.valueDataSelect === null) {
                throw new DatalistConstructionError('Value dataselect not found on dataprovider #'+this.dataproviderID, this.errorCallback)
            }

            this.valueDataSelectContainer?.classList.remove('hidden');
            this.valueDataSelect.itemIdentifierKey = data['options']['identifier'];
            this.valueDataSelect.itemLabelKey = data['options']['label'];
            await this.valueDataSelect.modifyUrl({
                'URL': data['options']['url'],
            });
        }
    }

    protected async performAddFilterEvent(filter:string, type:string, operator:string) {
        await super.performAddFilterEvent(filter, type, operator);

        if (type === 'data-select') {
            if (this.valueDataSelect === null) {
                throw new DatalistConstructionError('Value dataselect not found on dataprovider #'+this.dataproviderID, this.errorCallback)
            }

            const value = this.valueDataSelect.getSelectedItem();
            const label = this.valueDataSelect.getSelectedLabel();
            const displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + label;
            this.addFilter(displayString, filter, operator, value)
        }
    }
}