import type {DataproviderCore} from "../DataproviderCore";
import type {Constructor} from "./types";

export function ItemMixin<TBase extends Constructor<DataproviderCore>>(Base: TBase) {
    abstract class WithItems extends Base {
        protected initItemParameters() {
            this.itemIdentifierKey = this.dataprovider.getAttribute('data-identifier-key');
            this.itemLabelKey = this.dataprovider.getAttribute('data-label-key') ?? this.itemIdentifierKey;
            this.itemActivityKey = this.dataprovider.getAttribute('data-activity-key');
            this.newItemIdentifier = this.dataprovider.getAttribute('data-new-item-identifier') ?? 'new_data_item';
        }

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

        protected createNewItem(data:{[key:string]:any}): HTMLElement {
            return this.createItem(data);
        }

        protected addItem(data:{[key:string]:any}): void {
            let item = this.createItem(data);

            if (this.onItemCreateEvent !== null) {
                const newItem = this.onItemCreateEvent(this, item, data);
                if (newItem instanceof HTMLElement) {
                    item = newItem;
                }
            }

            this.body.append(this.addItemEvents(item, data));
        }

        protected addItemEvents(item: HTMLElement, data:{[key:string]:any}): HTMLElement {
            if (this.itemActivityKey !== null) {
                const activityCheckbox = item.querySelector(`[type="checkbox"][name="${this.itemActivityKey}"]`) as HTMLInputElement|null
                if (activityCheckbox !== null) {
                    activityCheckbox.addEventListener('change', this.toggleItemActivityEvent.bind(this, activityCheckbox));
                }
            }

            if (this.itemActivityKey !== null && data[this.itemActivityKey] == false) {
                this.applyReadonlyMode(item, true);
            }

            return item;
        }
    }
    return WithItems;
}
