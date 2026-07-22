import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';

/**
 * Regression: JSON.parse('null') / '42' / '"str"' / '[]' produce valid JSON but not a state
 * object. Downstream access to `data.page` etc. threw on these primitives before the guard
 * was added.
 */
describe('StatePersistenceMixin — malformed URL state', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    it.each([
        ['null', 'null'],
        ['a number', '42'],
        ['a string', '%22hi%22'],
        ['an array', '%5B1%2C2%5D'],
    ])('warns and falls back to load() when the state param is %s', async (_label, encoded) => {
        window.history.replaceState({}, '', `/?dp=${encoded}`);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        mountDataproviderDom();
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse([]);

        await expect((dp as any).loadFromUrlStorage()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalled();
        expect(dp.fetchCalls.length).toBe(1);

        warn.mockRestore();
    });
});
