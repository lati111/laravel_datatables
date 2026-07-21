/**
 * Mixin that provides item creation, rendering, and activity-toggle functionality for dataproviders that manage individual data items.
 * @module ItemMixin
 */
import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor, DataRecord} from "./types";

export function ItemMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithItems extends Base {
        /** Reads item configuration attributes (identifier, label, activity key, new-item identifier) from the dataprovider element. */
        protected initItemParameters() {
            this.itemIdentifierKey = this.dataprovider.getAttribute('data-identifier-key');
            this.itemLabelKey = this.dataprovider.getAttribute('data-label-key') ?? this.itemIdentifierKey;
            this.itemActivityKey = this.dataprovider.getAttribute('data-activity-key');
            this.newItemIdentifier = this.dataprovider.getAttribute('data-new-item-identifier') ?? 'new_data_item';
        }

        /** Creates and prepends a new blank item to the dataprovider body, respecting readonly mode. */
        public addNewItem(): void {
            const data = this.newItemData;
            if (this.itemIdentifierKey !== null) {
                data[this.itemIdentifierKey] = this.newItemIdentifier;
            }

            let item = this.createNewItem(data)
            item.classList.add('data-item-readonly-sensitive');
            item.classList.add('hidden-when-readonly');
            if (this.readonly) {
                item.classList.add('data-item-readonly');
                item.classList.add('hidden')
            }

            if (this.onItemCreateEvent !== null) {
                const newItem = this.onItemCreateEvent(this, item, data);
                if (newItem instanceof HTMLElement) {
                    item = newItem;
                }
            }

            this.body.prepend(this.addItemEvents(item, data));
        }

        /** Creates a new item element from the provided data using the base item creation logic. */
        protected createNewItem(data: DataRecord): HTMLElement {
            return this.createItem(data);
        }

        /** Creates an item element from data and appends it to the dataprovider body. */
        protected addItem(data: DataRecord): void {
            let item = this.createItem(data);

            if (this.onItemCreateEvent !== null) {
                const newItem = this.onItemCreateEvent(this, item, data);
                if (newItem instanceof HTMLElement) {
                    item = newItem;
                }
            }

            this.body.append(this.addItemEvents(item, data));
        }

        /** Binds activity-toggle and readonly events to an item element. */
        protected addItemEvents(item: HTMLElement, data: DataRecord): HTMLElement {
            if (this.itemActivityKey !== null) {
                const activityCheckbox = item.querySelector(`[type="checkbox"][name="${this.itemActivityKey}"]`) as HTMLInputElement|null
                if (activityCheckbox !== null) {
                    this.listen(activityCheckbox, 'change', this.toggleItemActivityEvent.bind(this, activityCheckbox));
                }
            }

            // Loose equality is intentional: activity flag may arrive as boolean false, number 0, or string "0".
            if (this.itemActivityKey !== null && data[this.itemActivityKey] == false) {
                this.applyReadonlyMode(item, true);
            }

            return item;
        }
    }
    return WithItems;
}
