import {DatalistError} from "./DatalistError";

export class DatalistErrorWithCallback extends DatalistError {
    public constructor(message:string, errorCallback: Function|null) {
        if (errorCallback !== null) {
            errorCallback(message);
        }

        super(message);
    }
}