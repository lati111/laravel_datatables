import {AbstractDataproviderTemplate} from "../AbstractDataproviderTemplate";

/** @property {Element} cardTemplate The template element that serves as the base for all cards */

export class DataCardList extends AbstractDataproviderTemplate {
    protected cardTemplate: Element|null = null;

    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        const cardTemplateId = this.dataprovider.getAttribute('data-card-template') ?? this.dataproviderID + '-template'
        this.cardTemplate = document.querySelector('#'+cardTemplateId);
        if (this.cardTemplate === null) {
            throw new Error(`Card template with id #${cardTemplateId} not found on cardlist #`+this.dataproviderID)
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
                    throw new Error(`Option with value "${value}" does not exist on select "${value}"`)
                }

                select.querySelector(`option`)?.removeAttribute('selected');
                option.setAttribute('selected', 'selected');
            }

            const span = item.querySelector(`span[name="${key}"], span[data-name="${key}"]`) as HTMLSpanElement|null
            if (span !== null) {
                span.textContent = value;
            }
        }

        return item;
    }
}
