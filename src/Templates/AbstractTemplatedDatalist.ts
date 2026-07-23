import {DatalistConstructionError} from "../Exceptions/DatalistConstructionError";
import { AbstractDatalistTemplate } from "./AbstractDatalistTemplate";

/**
 * Escapes a string for safe use inside an attribute-selector value.
 * Uses the native `CSS.escape` when available (all modern browsers) and falls back to a
 * minimal escape covering the characters that break `[attr="value"]` syntax otherwise
 * (jsdom pre-25 and older non-browser environments).
 */
function escapeSelector(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }
    return value.replace(/(["'\\\]\[])/g, '\\$1');
}

/** Clones an HTML template element and binds data values to inputs, selects, spans, and images. Extends {@link AbstractDatalistTemplate}. */
export class AbstractTemplatedDatalist extends AbstractDatalistTemplate {
    protected template: Element|null = null;

    /** @inheritDoc */
    protected setup(): void {
        super.setup();

        const templateId = this.dataprovider.getAttribute('data-template') ?? this.dataproviderID + '-template'
        this.template = document.getElementById(templateId);
        if (this.template === null) {
            throw new DatalistConstructionError(`Template with id #${templateId} not found for datalist #`+this.dataproviderID, this.errorCallback)
        }
    }

    /**
     * Creates a row to insert into datalist body
     * @param {Array} data Associative array to convert into a row
     * @return {HTMLTableRowElement} The created row
     */
    protected createItem(data: { [key: string]: any }): HTMLElement {
        const template = this.template as HTMLElement;
        const item = template.cloneNode(true) as HTMLElement;

        for (const key in data) {
            // Coerce null/undefined to empty string so we don't render the literal text "null"
            // in span/textarea assignments or set src="null" on images.
            const value = data[key] ?? '';
            // Response keys are trusted server data but may still contain characters like `"`
            // or `]` that break attribute-selector syntax; escape defensively.
            const safeKey = escapeSelector(key);

            //set inputs
            const inputs = item.querySelectorAll(`input[name="${safeKey}"]:not([type="checkbox"]), input[data-name="${safeKey}"]:not([type="checkbox"])`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                if (input !== null) {
                    input.value = value;
                }
            }

            //set checkboxes
            const checkboxes = item.querySelectorAll(`input[name="${safeKey}"][type="checkbox"], input[data-name="${safeKey}"][type="checkbox"]`) as NodeListOf<HTMLInputElement>;
            for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                if (checkbox !== null && (value === true || value === 'true' || value == 1)) {
                    checkbox.checked = true;
                }
            }


            //set textarea
            const textareas = item.querySelectorAll(`textarea[name="${safeKey}"], textarea[data-name="${safeKey}"]`) as NodeListOf<HTMLTextAreaElement>;
            for (let i = 0; i < textareas.length; i++) {
                const textarea = textareas[i];
                if (textarea !== null) {
                    textarea.textContent = value;
                }
            }

            //set select
            const selects = item.querySelectorAll(`select[name="${safeKey}"], select[data-name="${safeKey}"]`) as NodeListOf<HTMLSelectElement>;
            for (let i = 0; i < selects.length; i++) {
                const select = selects[i];
                // Use the raw data value here (not the null-coerced `value`) so we don't
                // spuriously try to match `option[value=""]` when the response is missing this key.
                if (select !== null && data[key] !== null && data[key] !== undefined) {
                    const option = select.querySelector(`option[value="${escapeSelector(String(value))}"]`) as HTMLOptionElement|null;
                    if (option === null) {
                        // Legacy/renamed values shouldn't kill the whole render — warn and skip.
                        console.warn(
                            `[Datalist] Option with value "${value}" does not exist on select "${safeKey}" ` +
                            `(dataprovider #${this.dataproviderID}) — leaving current selection.`
                        );
                        continue;
                    }

                    select.querySelector(`option`)?.removeAttribute('selected');
                    option.setAttribute('selected', 'selected');
                }
            }

            //set spans
            const spans = item.querySelectorAll(`span[name="${safeKey}"], span[data-name="${safeKey}"]`) as NodeListOf<HTMLSpanElement>;
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (span !== null) {
                    span.textContent = value;
                }
            }

            //set img
            const imgs = item.querySelectorAll(`img[name="${safeKey}"], img[data-name="${safeKey}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                if (img !== null) {
                    img.src = value;
                }
            }

            //set img alt
            const imgAlts = item.querySelectorAll(`img[data-alt-name="${safeKey}"]`) as NodeListOf<HTMLImageElement>;
            for (let i = 0; i < imgAlts.length; i++) {
                const img = imgAlts[i];
                if (img !== null) {
                    img.alt = value;
                }
            }

            //show hidden elements
            const hiddenElements = item.querySelectorAll(`[data-show-if-true-name="${safeKey}"]`) as NodeListOf<Element>;
            for (let i = 0; i < hiddenElements.length; i++) {
                const hidden = hiddenElements[i];
                if (value == true || value == 1) {
                    hidden.classList.remove('hidden');
                }
            }

            //hide elements
            const unhiddenElements = item.querySelectorAll(`[data-hide-if-true-name="${safeKey}"]`) as NodeListOf<Element>;
            for (let i = 0; i < unhiddenElements.length; i++) {
                const unhidden = unhiddenElements[i];
                if (value == true || value == 1) {
                    unhidden.classList.add('hidden');
                }
            }

            //misc data
            const miscAttributes = item.querySelectorAll(`[data-attribute-name="${safeKey}"]`) as NodeListOf<Element>;
            for (let i = 0; i < miscAttributes.length; i++) {
                const miscAttribute = miscAttributes[i];
                const attribute = miscAttribute.getAttribute('data-settable-attribute');
                if (attribute !== null) {
                    miscAttribute.setAttribute(attribute, value);
                }
            }

            const miscClasses = item.querySelectorAll(`[data-add-class-if-true-name="${safeKey}"]`) as NodeListOf<Element>;
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
