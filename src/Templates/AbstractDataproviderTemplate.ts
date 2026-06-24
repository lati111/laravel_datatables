import {DataproviderBase} from "../DataproviderBase";

/** Provides default fetch/post implementations using the browser Fetch API. First concrete layer above {@link DataproviderBase}. */
export abstract class AbstractDataproviderTemplate extends DataproviderBase {
    /** @inheritDoc */
    async fetchData(url: string): Promise<any> {
        const response = await fetch(url, {
            method: 'get',
            headers: {
                'Accept': 'application/json',
                "Sec-Fetch-Site": "same-origin"
            }
        });

        return await response.json();
    }

    /** @inheritDoc */
    async postData(url: string, parameters: FormData): Promise<any> {
        const response = await fetch(url, {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                "Sec-Fetch-Site": "same-origin"
            },
            body: parameters
        });

        return await response.json();
    }
}