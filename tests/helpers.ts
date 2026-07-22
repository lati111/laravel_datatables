import type { DataproviderCore } from '../src/DataproviderCore';
import { DataproviderBase } from '../src/DataproviderBase';
import type { DataRecord } from '../src/Mixins/types';

/**
 * Minimal concrete DataproviderBase used across tests.
 * Implementors decide the fetch response and the item shape.
 */
export class TestDataprovider extends DataproviderBase {
    public fetchResponses: unknown[] = [];
    public fetchCalls: string[] = [];
    public postCalls: Array<{ url: string; params: FormData }> = [];
    public shouldRejectFetch: Error | null = null;

    public queueFetchResponse(value: unknown): void {
        this.fetchResponses.push(value);
    }

    async fetchData(url: string): Promise<any> {
        this.fetchCalls.push(url);
        if (this.shouldRejectFetch !== null) {
            throw this.shouldRejectFetch;
        }
        if (this.fetchResponses.length === 0) {
            return [];
        }
        return this.fetchResponses.shift();
    }

    async postData(url: string, params: FormData): Promise<any> {
        this.postCalls.push({ url, params });
        return { ok: true };
    }

    protected createItem(data: DataRecord): HTMLElement {
        const el = document.createElement('div');
        el.classList.add('test-item');
        el.dataset.identifier = String(data.id ?? '');
        el.textContent = String(data.label ?? '');
        return el;
    }

    /** Test helper to expose renderSkeleton. */
    public callRenderSkeleton(): void {
        (this as unknown as DataproviderCore & { renderSkeleton(): void }).renderSkeleton();
    }
}

/** Mounts a minimal dataprovider DOM shell into document.body. */
export function mountDataproviderDom(options: {
    id?: string;
    contentUrl?: string;
    withPagination?: boolean;
    withSearchbar?: boolean;
    withSkeleton?: boolean;
    skeletonCount?: number;
    extraAttrs?: Record<string, string>;
} = {}): {
    root: HTMLElement;
    body: HTMLElement;
} {
    const id = options.id ?? 'dp';
    document.body.innerHTML = '';

    const root = document.createElement('div');
    root.id = id;
    root.classList.add('dataprovider');
    root.setAttribute('data-content-url', options.contentUrl ?? '/api/data');
    root.setAttribute('data-history', 'false');

    for (const [k, v] of Object.entries(options.extraAttrs ?? {})) {
        root.setAttribute(k, v);
    }

    const body = document.createElement('div');
    body.id = `${id}-content`;
    root.append(body);

    if (options.withSkeleton) {
        const tpl = document.createElement('template');
        tpl.id = `${id}-skeleton-template`;
        tpl.innerHTML = `<div class="skeleton-row"><span class="bar"></span></div>`;
        root.append(tpl);
        if (options.skeletonCount !== undefined) {
            root.setAttribute('data-skeleton-count', String(options.skeletonCount));
        }
    }

    if (options.withPagination) {
        const pag = document.createElement('div');
        pag.id = `${id}-pagination`;
        pag.classList.add('pagination');
        pag.setAttribute('data-count-url', '/api/data/pages');

        const content = document.createElement('div');
        content.id = `${id}-pagination-content`;
        pag.setAttribute('data-content-ID', content.id);
        pag.append(content);
        root.append(pag);
    }

    if (options.withSearchbar) {
        const searchbar = document.createElement('input');
        searchbar.id = `${id}-searchbar`;
        searchbar.classList.add('searchbar');
        searchbar.type = 'text';
        root.append(searchbar);
    }

    document.body.append(root);
    return { root, body };
}

/** Waits a microtask/macrotask cycle so pending promises can settle. */
export async function tick(): Promise<void> {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
}
