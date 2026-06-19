export type Constructor<T = {}> = abstract new (...args: any[]) => T;

/** Key-value data record representing a single data item. */
export type DataRecord = Record<string, any>;

/** Error callback signature used by datalist exceptions. */
export type ErrorCallback = ((message: string) => void) | null;
