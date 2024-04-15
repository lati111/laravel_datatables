/**
 * @property {string} identifier The unique identifier used for this item
 * @property {string} label The name that is displayed for this item
 * @property {Element|null} element The display element linked to this one
 */

export class Item {
    public readonly identifier:string;
    public readonly label:string;
    public element:Element|null = null;

    constructor(identifier:string, label:string = identifier) {
        this.identifier = identifier;
        this.label = label;
    }
}