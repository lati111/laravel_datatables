import {CoreSettings} from "./CoreSettings";

export class DataTableSettings extends CoreSettings {
    /** Whether each row should be treated as a form. */
    public isForm: boolean = false;

    /** The amount of pagination buttons adjacent to the current page on each side. */
    public paginationSize: number = 3;

    /** The amount of items displayed per page. */
    public itemsPerPage: number = 10;
}