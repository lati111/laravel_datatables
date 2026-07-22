import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';

describe('StatePersistenceMixin.loadFromUrlStorage', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    it('parses a valid JSON state and applies it', async () => {
        mountDataproviderDom({ withSearchbar: true });
        const dp = new TestDataprovider('dp');
        // Setup is required so searchbar/pagination refs exist before restore runs.
        (dp as any).setup();

        window.history.replaceState({}, '', `/?dp=${encodeURIComponent(JSON.stringify({ searchterm: 'hello' }))}`);
        dp.queueFetchResponse([]);

        await (dp as any).loadFromUrlStorage();

        expect((dp as any).searchterm).toBe('hello');
    });

    it('falls back to a plain load() when the URL param is malformed JSON', async () => {
        window.history.replaceState({}, '', '/?dp=%7B%22bad%22');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse([]);

        await expect((dp as any).loadFromUrlStorage()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalled();
        // A default load() should still fire.
        expect(dp.fetchCalls.length).toBe(1);

        warn.mockRestore();
    });

    it('no-ops the state restore when the URL param is absent', async () => {
        window.history.replaceState({}, '', '/');
        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse([]);

        await (dp as any).loadFromUrlStorage();
        expect(dp.fetchCalls.length).toBe(1);
    });
});
