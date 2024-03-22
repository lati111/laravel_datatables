export class ColumnHandler {
    public setter: Function|null = null;
    public getter: Function|null = null;

    public set(element: Element, value: any): any {
        if (this.setter !== null) {
            return this.setter(element);
        }

        return (element as HTMLInputElement).value = value;
    }

    public get(element: Element): any {
        if (this.getter !== null) {
            return this.getter(element);
        }

        return (element as HTMLInputElement).value;
    }
}