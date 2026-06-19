/**
 * Mixin that adds readonly/disabled state management to dataprovider elements.
 * Handles toggling interactive elements between editable and readonly states,
 * applying appropriate HTML attributes and CSS classes.
 */
import type {DataproviderCore} from "../DataproviderCore";
import {DatalistError} from "../Exceptions/DatalistError";
import type {Constructor} from "./types";

export function ReadonlyMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithReadonly extends Base {
        /** Applies readonly mode to a specific data item or the entire dataprovider. */
        protected applyReadonlyMode(dataItem: Element|null = null, eventless: boolean = false): void {
            let readonlyClass = 'data-item-readonly'
            if (dataItem === null) {
                dataItem = this.disableContainer ?? this.dataprovider;
                dataItem.classList.add('datalist-readonly');
            } else {
                dataItem.classList.add('data-item-inactive');
                readonlyClass = 'data-item-individual-readonly';
                if (eventless === false && this.onItemDisableEvent !== null) {
                    this.onItemDisableEvent(this, dataItem);
                }
            }

            const readonlySensitiveItems = dataItem.querySelectorAll('.data-item-readonly-sensitive');
            for (let i = 0; i < readonlySensitiveItems.length; i++) {
                const item = readonlySensitiveItems[i] as HTMLElement;
                this.setElementReadonlyState(item, 'apply');
                item.classList.add(readonlyClass)
                if (item.classList.contains('hidden-when-readonly')) {
                    item.classList.add('hidden');
                }
            }
        }

        /** Removes readonly mode from a specific data item or the entire dataprovider. */
        protected removeReadonlyMode(dataItem: Element|null = null, eventless: boolean = false): void {
            let readonlyClass = 'data-item-readonly'
            if (dataItem === null) {
                dataItem = this.disableContainer ?? this.dataprovider;
                dataItem.classList.remove('datalist-readonly');
            } else {
                dataItem.classList.remove('data-item-inactive');
                readonlyClass = 'data-item-individual-readonly';
                if (eventless === false && this.onItemEnableEvent !== null) {
                    this.onItemEnableEvent(this, dataItem);
                }
            }

            const readonlyItems = dataItem.querySelectorAll('.data-item-readonly-sensitive.'+readonlyClass);
            for (let i = 0; i < readonlyItems.length; i++) {
                const item = readonlyItems[i] as HTMLElement;
                item.classList.remove(readonlyClass)
                if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
                    continue;
                }

                this.setElementReadonlyState(item, 'remove');

                if (item.classList.contains('hidden-when-readonly')) {
                    item.classList.remove('hidden');
                }
            }
        }

        private setElementReadonlyState(item: HTMLElement, mode: 'apply' | 'remove'): void {
            const isApply = mode === 'apply';
            switch (item.tagName) {
                case 'INPUT':
                    const input = item as HTMLInputElement;
                    switch (input.type) {
                        case 'radio':
                        case 'checkbox':
                            isApply ? this.markItemAsDisabled(item) : this.unmarkItemAsDisabled(item);
                            break;
                        default:
                            isApply ? this.markItemAsReadonly(item) : this.unmarkItemAsReadonly(item);
                    }
                    break;
                case 'TEXTAREA':
                    isApply ? this.markItemAsReadonly(item) : this.unmarkItemAsReadonly(item);
                    break;
                default:
                case 'A':
                case 'BUTTON':
                case 'SELECT':
                    isApply ? this.markItemAsDisabled(item) : this.unmarkItemAsDisabled(item);
                    break;
            }
        }

        private markItemAsReadonly(item: Element): Element {
            if (item.hasAttribute('readonly') === true) {
                return item;
            }
            item.setAttribute('readonly', 'readonly');
            return item;
        }

        private markItemAsDisabled(item: Element): Element {
            if (item.hasAttribute('disabled') === true) {
                return item;
            }
            item.setAttribute('disabled', 'disabled');
            return item;
        }

        private unmarkItemAsReadonly(item: Element): Element {
            if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
                return item;
            }
            item.removeAttribute('readonly');
            return item;
        }

        private unmarkItemAsDisabled(item: Element): Element {
            if (item.classList.contains('data-item-readonly') || item.classList.contains('data-item-individual-readonly')) {
                return item;
            }
            item.removeAttribute('disabled');
            return item;
        }

        /** Enables readonly mode on the entire dataprovider. */
        public enableReadonlyMode(): void {
            this.readonly = true;
            this.applyReadonlyMode();
        }

        /** Disables readonly mode on the entire dataprovider. */
        public disableReadonlyMode(): void {
            this.readonly = false;
            this.removeReadonlyMode();
        }

        /** Toggles readonly state on the data item associated with the given checkbox. */
        protected toggleItemActivityEvent(element:HTMLInputElement) {
            const dataItem = element.closest('.data-item');
            if (dataItem === null) {
                throw new DatalistError('Data item not found on activity toggle', this.errorCallback);
            }

            if (element.checked) {
                this.removeReadonlyMode(dataItem);
            } else {
                this.applyReadonlyMode(dataItem);
            }
        }
    }
    return WithReadonly;
}
