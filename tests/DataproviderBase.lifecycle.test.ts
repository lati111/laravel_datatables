import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from './helpers';

describe('DataproviderBase — lifecycle', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('destroy()', () => {
        it('makes subsequent load() calls no-op', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([]);
            await dp.init();

            const before = dp.fetchCalls.length;
            dp.destroy();
            await dp.load();

            expect(dp.fetchCalls.length).toBe(before);
        });
    });

    describe('userInitiatedLoad flag', () => {
        it('is reset after every performLoad, even when the load errors', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');

            // First (initial) successful load — flag not set.
            dp.queueFetchResponse([]);
            await dp.init();
            expect((dp as any).userInitiatedLoad).toBe(false);

            // User marks a load as initiated but fetch rejects.
            (dp as any).userInitiatedLoad = true;
            dp.shouldRejectFetch = new Error('down');
            await expect(dp.load()).rejects.toThrow('down');

            // Flag must be cleared so a subsequent programmatic load doesn't inherit it.
            expect((dp as any).userInitiatedLoad).toBe(false);

            dp.shouldRejectFetch = null;
        });
    });
});
