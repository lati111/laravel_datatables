import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from './helpers';

describe('DataproviderBase — schema v3 envelope detection', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('recognises an envelope by the presence of `pagination`', async () => {
        mountDataproviderDom({ withPagination: true });
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse({
            items: [{ id: 1, label: 'A' }],
            pagination: { page: 1, perpage: 10, pages: 3 },
        });
        await dp.init();

        expect((dp as any).pages).toBe(3);
        expect(document.querySelectorAll('.test-item').length).toBe(1);
    });

    it('recognises an envelope by the presence of `filters`', async () => {
        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse({
            items: [{ id: 1, label: 'A' }],
            filters: [],
        });
        await dp.init();

        expect(document.querySelectorAll('.test-item').length).toBe(1);
    });

    it('recognises an envelope when items is an array even without other envelope keys', async () => {
        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse({ items: [{ id: 1, label: 'A' }] });
        await dp.init();

        expect(document.querySelectorAll('.test-item').length).toBe(1);
    });

    it('treats a legacy payload with a non-array items property as raw data (not an envelope)', async () => {
        // Regression guard: a legacy response `{ items: "some text", other: 42 }` must NOT
        // be interpreted as a v3 envelope. Instead we iterate the payload as an object.
        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse({ items: 'a string not an array', otherKey: 'x' });
        await dp.init();

        // Interpreted as an object with two keys; each maps to one addItem() call.
        expect(document.querySelectorAll('.test-item').length).toBe(2);
    });
});
