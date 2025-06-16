export class DataOperationsModule {
    /** @inheritDoc */
    async getData(url: string): Promise<any> {
        const response = await fetch(url, {
            method: 'get',
            headers: {
                'Accept': 'application/json',
                "Sec-Fetch-Site": "same-origin"
            }
        });

        const data = await response.json();
        return data as Array<Array<any>>;
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

        const data = await response.json();
        return data as Array<Array<any>>;
    }
}