import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";
import {DatalistConstructionError} from "../../Exceptions/DatalistConstructionError";
import {DatalistLoadingError} from "../../Exceptions/DatalistLoadingError";
import {AbstractDatalistTemplate} from "../AbstractDatalistTemplate";

/** @property {Element} cardTemplate The template element that serves as the base for all cards */

export class DataCardList extends AbstractDatalistTemplate {
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
            const inputs = item.querySelectorAll(`input[name="${key}"]:not([type="checkbox"]), input[data-name="${key}"]:not([type="checkbox"])`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                if (input !== null) {
                    input.value = value;
                }
            }

            //set checkboxes
            const checkboxes = item.querySelectorAll(`input[name="${key}"][type="checkbox"], input[data-name="${key}"][type="checkbox"]`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                if (checkbox !== null && (value === true || value === 'true' || value == 1)) {
                    checkbox.checked = true;
                }
            }


            //set textarea
            const textareas = item.querySelectorAll(`textarea[name="${key}"], textarea[data-name="${key}"]`) as NodeListOf<HTMLTextAreaElement>;
            for (let i = 0; i < textareas.length; i++) {
                const textarea = textareas[i];
                if (textarea !== null) {
                    textarea.textContent = value;
                }
            }

            //set select
            const selects = item.querySelectorAll(`select[name="${key}"], select[data-name="${key}"]`) as NodeListOf<HTMLSelectElement>;
            for (let i = 0; i < selects.length; i++) {
                const select = selects[i];
                if (select !== null && value !== null) {
                    const option = select.querySelector(`option[value="${value}"]`) as HTMLOptionElement|null;
                    if (option === null) {
                        throw new DatalistLoadingError(`Option with value "${value}" does not exist on select "${value}"`, this.errorCallback)
                    }

                    select.querySelector(`option`)?.removeAttribute('selected');
                    option.setAttribute('selected', 'selected');
                }
            }

            //set spans
            const spans = item.querySelectorAll(`span[name="${key}"], span[data-name="${key}"]`) as NodeListOf<HTMLSpanElement>;
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (span !== null) {
                    span.textContent = value;
                }
            }

            //set img
            const imgs = item.querySelectorAll(`img[name="${key}"], img[data-name="${key}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                if (img !== null) {
                    img.src = value;
                }
            }

            //set img alt
            const imgAlts = item.querySelectorAll(`img[data-alt-name="${key}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgAlts.length; i++) {
                const img = imgAlts[i];
                if (img !== null) {
                    img.alt = value;
                }
            }

            //show hidden elements
            const hiddenElements = item.querySelectorAll(`[data-show-if-true-name="${key}"]`) as NodeListOf<Element>;
            for (let i = 0; i < hiddenElements.length; i++) {
                const hidden = hiddenElements[i];
                if (value == true || value == 1) {
                    hidden.classList.remove('hidden');
                }
            }

            //hide elements
            const unhiddenElements = item.querySelectorAll(`[data-hide-if-true-name="${key}"]`) as NodeListOf<Element>;
            for (let i = 0; i < unhiddenElements.length; i++) {
                const unhidden = unhiddenElements[i];
                if (value == true || value == 1) {
                    unhidden.classList.add('hidden');
                }
            }

            //misc data
            const miscAttributes = item.querySelectorAll(`[data-attribute-name="${key}"]`) as NodeListOf<Element>;
            for (let i = 0; i < miscAttributes.length; i++) {
                const miscAttribute = miscAttributes[i];
                const attribute = miscAttribute.getAttribute('data-settable-attribute');
                if (attribute !== null) {
                    miscAttribute.setAttribute(attribute, value);
                }
            }

            const miscClasses = item.querySelectorAll(`[data-add-class-if-true-name="${key}"]`) as NodeListOf<Element>;
            for (let i = 0; i < miscClasses.length; i++) {
                const miscClass = miscClasses[i];
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
