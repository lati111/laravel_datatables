import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataCardList } from '../../src/Templates/Cardlist/DataCardList';
import { DatalistLoadingError } from '../../src/Exceptions/DatalistLoadingError';

function mount(): void {
    document.body.innerHTML = '';
    const root = document.createElement('div');
    root.id = 'cards';
    root.classList.add('dataprovider');
    root.setAttribute('data-content-url', '/api/cards');
    root.setAttribute('data-history', 'false');
    root.setAttribute('data-template', 'cards-template');

    const content = document.createElement('div');
    content.id = 'cards-content';
    root.append(content);

    const invisible = document.createElement('div');
    invisible.classList.add('hidden');
    const template = document.createElement('div');
    template.id = 'cards-template';
    template.innerHTML = '<span data-name="name"></span>';
    invisible.append(template);

    document.body.append(root);
    document.body.append(invisible);
}

describe('AbstractDataproviderTemplate — fetch/post', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
        document.body.innerHTML = '';
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('throws DatalistLoadingError with the HTTP status when fetch returns a non-2xx response', async () => {
        mount();
        globalThis.fetch = vi.fn(async () => new Response('server exploded', {
            status: 500,
            statusText: 'Internal Server Error',
        })) as unknown as typeof fetch;

        const dp = new DataCardList('cards');
        await expect(dp.init()).rejects.toBeInstanceOf(DatalistLoadingError);
        await expect(dp.init()).rejects.toThrow(/HTTP 500/);
    });

    it('throws DatalistLoadingError when the response body is not valid JSON', async () => {
        mount();
        globalThis.fetch = vi.fn(async () => new Response('<html>not json</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        })) as unknown as typeof fetch;

        const dp = new DataCardList('cards');
        await expect(dp.init()).rejects.toBeInstanceOf(DatalistLoadingError);
        await expect(dp.init()).rejects.toThrow(/was not valid JSON/);
    });

    it('sends the CSRF meta token in postData when present', async () => {
        mount();
        // Simulate Blade layout adding the meta.
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'csrf-token');
        meta.setAttribute('content', 'test-csrf-abc');
        document.head.append(meta);

        let capturedHeaders: HeadersInit | undefined;
        globalThis.fetch = vi.fn(async (_url, init) => {
            capturedHeaders = init?.headers;
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const dp = new DataCardList('cards');
        await dp.postData('/api/cards/save', new FormData());

        expect((capturedHeaders as Record<string, string>)['X-CSRF-TOKEN']).toBe('test-csrf-abc');
        meta.remove();
    });

    it('sends credentials: same-origin so session cookies reach the server', async () => {
        mount();
        let capturedInit: RequestInit | undefined;
        globalThis.fetch = vi.fn(async (_url, init) => {
            capturedInit = init;
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const dp = new DataCardList('cards');
        await dp.init();

        expect(capturedInit?.credentials).toBe('same-origin');
    });
});
