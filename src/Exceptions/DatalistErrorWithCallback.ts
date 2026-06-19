import {DatalistError} from "./DatalistError";
import type {ErrorCallback} from "../Mixins/types";

export class DatalistErrorWithCallback extends DatalistError {
    public constructor(message:string, errorCallback: ErrorCallback) {
        if (errorCallback !== null) {
            errorCallback(message);
        }

        super(message);
    }
}