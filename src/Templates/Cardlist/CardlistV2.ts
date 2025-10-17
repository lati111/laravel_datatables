import {DataTableSettings} from "../../Settings/DataTableSettings";
import {DatalistCore} from "../../DatalistCore";
import {Column} from "../../Data/Column";
import {DatalistLoadingError} from "../../Exceptions/DatalistLoadingError";

export class CardlistV2 extends DatalistCore {
    /** @inheritDoc */
    public settings: DataTableSettings = new DataTableSettings();

    public template: HTMLElement;

    /**
     * @inherit
     */
    public constructor(dataprovider: Element|string, cardTemplate: HTMLElement, body: Element|string|null = null, paginationElement: HTMLElement|null = null) {
        super(dataprovider, body, paginationElement);
        this.template = cardTemplate;
        this.template.style.visibility = 'hidden';
    }


    /** @inheritDoc */
    protected createItem(data: { [p: string]: any }): HTMLElement {
        const card = this.template.cloneNode(true) as HTMLElement;
        card.style.visibility = 'visible';

        for (const key in data) {
            const value = data[key];
            console.log(key)

            //set inputs
            const inputs = card.querySelectorAll(`input[data-name="${key}"]:not([type="checkbox"])`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                if (input !== null) {
                    input.value = value;
                }
            }

            //set checkboxes
            const checkboxes = card.querySelectorAll(`input[name="${key}"][type="checkbox"], input[data-name="${key}"][type="checkbox"]`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                if (checkbox !== null && (value === true || value === 'true' || value == 1)) {
                    checkbox.checked = true;
                }
            }


            //set textarea
            const textareas = card.querySelectorAll(`textarea[data-name="${key}"]`) as NodeListOf<HTMLTextAreaElement>;
            for (let i = 0; i < textareas.length; i++) {
                const textarea = textareas[i];
                if (textarea !== null) {
                    textarea.textContent = value;
                }
            }

            //set select
            const selects = card.querySelectorAll(`select[data-name="${key}"]`) as NodeListOf<HTMLSelectElement>;
            for (let i = 0; i < selects.length; i++) {
                const select = selects[i];
                if (select !== null && value !== null) {
                    const option = select.querySelector(`option[value="${value}"]`) as HTMLOptionElement|null;
                    if (option === null) {
                        console.error('Option does not exist')
                    } else {
                        select.querySelector(`option`)?.removeAttribute('selected');
                        option.setAttribute('selected', 'selected');
                    }
                }
            }

            //set spans
            const spans = card.querySelectorAll(`span[data-name="${key}"]`) as NodeListOf<HTMLSpanElement>;
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (span !== null) {
                    span.textContent = value;
                }
            }

            //set img
            const imgs = card.querySelectorAll(`img[data-name="${key}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                if (img !== null) {
                    img.src = value;
                }
            }

            //set img alt
            const imgAlts = card.querySelectorAll(`img[data-alt-name="${key}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgAlts.length; i++) {
                const img = imgAlts[i];
                if (img !== null) {
                    img.alt = value;
                }
            }
        }

        return card;
    }
}