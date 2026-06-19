/** Represents a single active filter with its source type, column, operator, and value. */
export class Filter {
    /** Source type: `form`, `manual`, `checkbox`, `input`, or `dataselect`. */
    public readonly type: string;

    /** The DOM element displaying this filter as a removable chip, if any. */
    public displayElement: HTMLElement|null = null;

    /** Human-readable label shown in the filter display chip. */
    public display: string|null;

    /** Column name this filter applies to. */
    public readonly filter: string;

    /** Comparison operator (e.g. `=`, `!=`, `>`, `<`, `LIKE`). */
    public readonly operator: string;

    /** Filter value, or null for valueless operators. */
    public readonly value: string|null;

    /**
     * @param type - Source that created this filter (`form`, `manual`, `checkbox`, `input`, `dataselect`).
     * @param filter - Column name to filter on.
     * @param operator - Comparison operator.
     * @param value - Filter value.
     * @param display - Human-readable label for the filter chip.
     */
    public constructor(type:string, filter:string, operator:string, value:string|null = null, display:string|null = null) {
        this.type = type;
        this.display = display;
        this.filter = filter;
        this.operator = operator;
        this.value = value;
    }
}