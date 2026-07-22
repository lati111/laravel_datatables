import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataCardList } from '../../src/Templates/Cardlist/DataCardList';
import { mountDataproviderDom } from '../helpers';

/**
 * DataCardList is the simplest concrete subclass of AbstractTemplatedDatalist,
 * so we use it as the smoke-test surface for template cloning behavior.
 */
describe('AbstractTemplatedDatalist', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    function mountCardlist(): { root: HTMLElement } {
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

        const template = document.createElement('div');
        template.id = 'cards-template';
        template.innerHTML = `
            <span data-name="title"></span>
            <select data-name="status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        `;
        // The template lives in an invisible container so its content doesn't render.
        const invisible = document.createElement('div');
        invisible.classList.add('hidden');
        invisible.append(template);

        document.body.append(root);
        document.body.append(invisible);

        return { root };
    }

    it('warns and continues when a select value has no matching option', async () => {
        mountCardlist();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const dp = new (DataCardList as any)('cards');
        // Bypass fetchData with a stub value.
        dp.fetchData = async () => [{ title: 'Test', status: 'unknown-value' }];
        dp.postData = async () => ({});

        await expect(dp.init()).resolves.toBeUndefined();

        // No exception thrown — the row must still exist in the body.
        const rows = document.querySelectorAll('#cards-content > *');
        expect(rows.length).toBe(1);
        // The item's title span is still set.
        expect(rows[0].querySelector('span[data-name="title"]')!.textContent).toBe('Test');
        // Warning was surfaced.
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
    });

    it('marks the matching option as selected when the value exists', async () => {
        mountCardlist();
        const dp = new (DataCardList as any)('cards');
        dp.fetchData = async () => [{ title: 'OK', status: 'inactive' }];
        dp.postData = async () => ({});

        await dp.init();

        const select = document.querySelector('#cards-content select')!;
        const selected = select.querySelector('option[selected]');
        expect(selected).not.toBeNull();
        expect(selected!.getAttribute('value')).toBe('inactive');
    });
});
