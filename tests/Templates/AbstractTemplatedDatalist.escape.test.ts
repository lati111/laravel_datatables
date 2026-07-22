import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataCardList } from '../../src/Templates/Cardlist/DataCardList';

/**
 * Regression: `escapeSelector` had a bug where the CSS.escape-available branch called itself
 * recursively instead of the browser API — infinite loop in real browsers, hidden in jsdom
 * because CSS was undefined. This suite stubs CSS.escape to prove the browser path works.
 */
describe('AbstractTemplatedDatalist — escapeSelector via CSS.escape', () => {
    let originalCss: unknown;

    beforeEach(() => {
        document.body.innerHTML = '';
        originalCss = (globalThis as any).CSS;
        // Stub a browser-like CSS.escape.
        (globalThis as any).CSS = {
            escape: (s: string) => s.replace(/(["'\\\]\[])/g, '\\$1'),
        };
    });

    afterEach(() => {
        (globalThis as any).CSS = originalCss;
    });

    function mount(): void {
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

    it('does not stack-overflow when CSS.escape is available (browser path)', async () => {
        mount();
        const dp = new (DataCardList as any)('cards');
        dp.fetchData = async () => [{ name: 'evil"value' }];
        dp.postData = async () => ({});

        // Should complete without RangeError: Maximum call stack size exceeded.
        await expect(dp.init()).resolves.toBeUndefined();

        const span = document.querySelector('#cards-content span[data-name="name"]');
        expect(span?.textContent).toBe('evil"value');
    });
});
