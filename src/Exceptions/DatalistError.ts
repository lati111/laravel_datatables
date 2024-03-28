export class DatalistError extends Error {
    public constructor(message:string, errorCallback: Function|null) {
        if (errorCallback !== null) {
            errorCallback(message);
        }

        super(message);
    }
}