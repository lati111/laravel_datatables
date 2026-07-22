import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataCardList } from '../../src/Templates/Cardlist/DataCardList';

function mountCardlist(templateHtml: string): void {
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
    template.innerHTML = templateHtml;
    invisible.append(template);

    document.body.append(root);
    document.body.append(invisible);
}

describe('AbstractTemplatedDatalist hardening', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('does not crash when a response value contains characters that break CSS selectors', async () => {
        mountCardlist('<span data-name="name"></span>');
        const dp = new (DataCardList as any)('cards');
        // Value containing an unescaped double quote would crash the raw querySelector.
        dp.fetchData = async () => [{ name: 'evil"value' }];
        dp.postData = async () => ({});

        await expect(dp.init()).resolves.toBeUndefined();
        // The span still received the value as text.
        const span = document.querySelector('#cards-content span[data-name="name"]');
        expect(span?.textContent).toBe('evil"value');
    });

    it('coerces a null response value to empty string instead of rendering literal "null"', async () => {
        mountCardlist('<span data-name="name"></span>');
        const dp = new (DataCardList as any)('cards');
        dp.fetchData = async () => [{ name: null }];
        dp.postData = async () => ({});

        await dp.init();
        const span = document.querySelector('#cards-content span[data-name="name"]');
        expect(span?.textContent).toBe('');
    });

    it('does not attempt to select an option when the response value for a select is missing', async () => {
        mountCardlist(`
            <select data-name="status">
                <option value="a">A</option>
                <option value="b">B</option>
            </select>
        `);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const dp = new (DataCardList as any)('cards');
        // No `status` key on the row — should not warn about "option '' does not exist".
        dp.fetchData = async () => [{ other: 'x' }];
        dp.postData = async () => ({});
        await dp.init();

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
