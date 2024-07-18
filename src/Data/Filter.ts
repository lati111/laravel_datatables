export class Filter {
    public readonly type: string;

    /** @type {HTMLElement|null} The element this filter uses as it's display */
    public displayElement: HTMLElement|null = null;

    /** @type {string} The formatted string to display for this filter */
    public display: string|null;

    /** @type {string} The filter name */
    public readonly filter: string;

    /** @type {string} The operator used in the filter */
    public readonly operator: string;

    /** @type {string|null} The value used in the filter */
    public readonly value: string|null;

    public constructor(type:string, filter:string, operator:string, value:string|null = null, display:string|null = null) {
        this.type = type;
        this.display = display;
        this.filter = filter;
        this.operator = operator;
        this.value = value;
    }
}