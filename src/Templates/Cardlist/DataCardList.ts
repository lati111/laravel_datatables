import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";
import {DatalistConstructionError} from "../../Exceptions/DatalistConstructionError";
import {DatalistLoadingError} from "../../Exceptions/DatalistLoadingError";

/** @property {Element} cardTemplate The template element that serves as the base for all cards */

export class DataCardList extends AbstractDataproviderTemplate {
    protected cardTemplate: Element|null = null;

    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        const cardTemplateId = this.dataprovider.getAttribute('data-card-template') ?? this.dataproviderID + '-template'
        this.cardTemplate = document.querySelector('#'+cardTemplateId);
        if (this.cardTemplate === null) {
            throw new DatalistConstructionError(`Card template with id #${cardTemplateId} not found on cardlist #`+this.dataproviderID, this.errorCallback)
        }
    }

    /**
     * Creates a row to insert into the table
     * @param {Array} data Associative array to convert into a row
     * @return {HTMLTableRowElement} The created row
     */
    protected createItem(data: { [key: string]: any }): HTMLElement {
        const template = this.cardTemplate as HTMLElement;
        const item = template.cloneNode(true) as HTMLElement;

        for (const key in data) {
            const value = data[key];

            //set inputs
            const input = item.querySelector(`input[name="${key}"]:not([type="checkbox"]), input[data-name="${key}"]:not([type="checkbox"])`) as HTMLInputElement|null
            if (input !== null) {
                input.value = value;
            }

            //set checkboxes
            const checkbox = item.querySelector(`input[name="${key}"][type="checkbox"], input[data-name="${key}"][type="checkbox"]`) as HTMLInputElement|null
            if (checkbox !== null && (value === true || value === 'true' || value == 1)) {
                checkbox.checked = true;
            }

            //set textarea
            const textarea = item.querySelector(`textarea[name="${key}"], textarea[data-name="${key}"]`) as HTMLTextAreaElement|null
            if (textarea !== null) {
                textarea.textContent = value;
            }

            //set select
            const select = item.querySelector(`select[name="${key}"], select[data-name="${key}"]`) as HTMLSelectElement|null
            if (select !== null && value !== null) {
                const option = select.querySelector(`option[value="${value}"]`) as HTMLOptionElement|null;
                if (option === null) {
                    throw new DatalistLoadingError(`Option with value "${value}" does not exist on select "${value}"`, this.errorCallback)
                }

                select.querySelector(`option`)?.removeAttribute('selected');
                option.setAttribute('selected', 'selected');
            }

            //set spans
            const span = item.querySelector(`span[name="${key}"], span[data-name="${key}"]`) as HTMLSpanElement|null
            if (span !== null) {
                span.textContent = value;
            }

            //set img
            const img = item.querySelector(`img[name="${key}"], img[data-name="${key}"]`) as HTMLImageElement|null
            if (img !== null) {
                img.src = value;
            }

            //set img alt
            const imgAlt = item.querySelector(`img[data-alt-name="${key}"]`) as HTMLImageElement|null
            if (imgAlt !== null) {
                imgAlt.alt = value;
            }

            //show hidden elements
            const hidden = item.querySelector(`[data-show-if-true-name="${key}"]`) as Element|null
            if (hidden !== null) {
                if (value == true || value == 1) {
                    hidden.classList.remove('hidden');
                }
            }

            //hide elements
            const unhidden = item.querySelector(`[data-hide-if-true-name="${key}"]`) as Element|null
            if (unhidden !== null) {
                if (value == true || value == 1) {
                    unhidden.classList.add('hidden');
                }
            }

            //misc data
            const miscAttribute = item.querySelector(`[data-attribute-name="${key}"]`) as Element|null;
            if (miscAttribute !== null) {
                const attribute = miscAttribute.getAttribute('data-settable-attribute');
                if (attribute !== null) {
                    miscAttribute.setAttribute(attribute, value);
                }
            }

            const miscClass = item.querySelector(`[data-add-class-is-true-name="${key}"]`) as Element|null;
            if (miscClass !== null) {
                const addableClass = miscClass.getAttribute('data-class-to-add');
                if (addableClass !== null) {
                    if (value == true || value == 1) {
                        miscClass.classList.add(addableClass)
                    }
                }
            }
        }

        return item;
    }
}
