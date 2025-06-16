export class CoreSettings {
    /** The text to display when the dataprovider returned no results. */
    public empty_body_string: string = 'No results.';

    /** Whether to hide the body while loading data. */
    public hide_body_during_loading: boolean = false;

    /** Whether or not to store history. */
    public history: boolean = true;
}