import {DataproviderBase} from "../DataproviderBase";
import {AbstractDataproviderTemplate} from "./AbstractDataproviderTemplate";
import {DataSelect} from "./Select/Dataselect";
import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";

export abstract class AbstractDatalistTemplate extends AbstractDataproviderTemplate {
    //| Filter properties

    /** @type {DataSelect|null} The dataselect for values in the filter form */
    protected valueDataSelect: DataSelect | null = null;

    /** @type {Element|null} The container for the dataselect */
    protected valueDataSelectContainer: HTMLElement | null = null;


    //| Setup
    /** @inheritDoc */
    protected async filterInit(): Promise<void> {
        if (this.valueDataSelect !== null) {
            await this.valueDataSelect.init();
        }

        await super.filterInit();
    }

    /** @inheritDoc */
    protected filterSetup(): void {
        super.filterSetup();

        if (this.filterForm === null) {
            return;
        }

        const valueSelect = this.filterForm.querySelector('.dataselect-container [name="dataselect"]');
        if (valueSelect !== null) {
            if (valueSelect.id === null) {
                valueSelect.id = this.dataproviderID + '-value-dataselect';
            }

            this.valueDataSelect = new DataSelect(valueSelect.id)
            this.valueDataSelectContainer = this.filterForm.querySelector('.dataselect-container');
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
            const displayString = filter + ' ' + this.operatorSelect!.options[this.operatorSelect!.selectedIndex].textContent + ' ' + value;
            this.addFilter(displayString, filter, operator, value)
        }
    }
}