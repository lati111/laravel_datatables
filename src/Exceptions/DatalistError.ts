import type { ErrorCallback } from '../Mixins/types';

/**
 * Base class for every datalist-thrown exception. When an `errorCallback` is provided
 * it is invoked with the message before the throw propagates, so consumers can surface
 * user-friendly errors from a central handler.
 */
export class DatalistError extends Error {
    public constructor(message: string, errorCallback: ErrorCallback = null) {
        if (errorCallback !== null) {
            errorCallback(message);
        }
        super(message);
    }
}
