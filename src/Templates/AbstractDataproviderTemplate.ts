import {DataproviderBase} from "../DataproviderBase";
import {DatalistLoadingError} from "../Exceptions/DatalistLoadingError";

/** Provides default fetch/post implementations using the browser Fetch API. First concrete layer above {@link DataproviderBase}. */
export abstract class AbstractDataproviderTemplate extends DataproviderBase {
    /** @inheritDoc */
    async fetchData(url: string): Promise<any> {
        const response = await fetch(url, {
            method: 'get',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Sec-Fetch-Site': 'same-origin',
            },
        });

        return this.parseJsonResponse(response, url);
    }

    /** @inheritDoc */
    async postData(url: string, parameters: FormData): Promise<any> {
        const csrfHeaders: Record<string, string> = {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Site': 'same-origin',
        };

        // Laravel expects an X-CSRF-TOKEN header on non-GET requests when session auth is in
        // use. Read the standard `<meta name="csrf-token">` element written by Blade layouts.
        const csrfMeta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
        if (csrfMeta !== null && csrfMeta.content !== '') {
            csrfHeaders['X-CSRF-TOKEN'] = csrfMeta.content;
        }

        const response = await fetch(url, {
            method: 'post',
            credentials: 'same-origin',
            headers: csrfHeaders,
            body: parameters,
        });

        return this.parseJsonResponse(response, url);
    }

    /**
     * Verifies the response is OK and safely parses JSON. Non-2xx responses surface a
     * DatalistLoadingError with the HTTP status so the errorCallback can render a message,
     * instead of a cryptic "Unexpected token < in JSON" from a stray HTML error page.
     */
    private async parseJsonResponse(response: Response, url: string): Promise<any> {
        if (!response.ok) {
            throw new DatalistLoadingError(
                `Request to ${url} failed with HTTP ${response.status} ${response.statusText}`,
                this.errorCallback
            );
        }

        try {
            return await response.json();
        } catch (err) {
            throw new DatalistLoadingError(
                `Response from ${url} was not valid JSON`,
                this.errorCallback
            );
        }
    }
}