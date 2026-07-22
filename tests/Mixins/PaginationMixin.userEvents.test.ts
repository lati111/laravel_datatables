import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';

describe('PaginationMixin — event handling', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('pageChangeEvent resolves clicks on nested descendants via currentTarget', async () => {
        mountDataproviderDom({ withPagination: true });
        const dp = new TestDataprovider('dp');
        dp.queueFetchResponse({ items: [], pagination: { page: 1, perpage: 10, pages: 5 } });
        await dp.init();

        (dp as any).page = 1;
        (dp as any).renderPagination();

        // Find the button for page 3 and click via a nested inner span (simulating an icon).
        const btn = document.querySelector('#dp-pagination-content button[data-value="3"]') as HTMLButtonElement;
        expect(btn).not.toBeNull();

        const inner = document.createElement('span');
        inner.textContent = '3';
        btn.append(inner);

        dp.queueFetchResponse({ items: [], pagination: { page: 3, perpage: 10, pages: 5 } });

        // Dispatch a click whose target is the nested span, but currentTarget is the button.
        // In the browser this happens naturally; in tests we call the handler directly.
        await (dp as any).pageChangeEvent({ target: inner, currentTarget: btn });

        expect((dp as any).page).toBe(3);
    });

    it('perPageChangeEvent resets to page 1 after the new perpage is applied', async () => {
        mountDataproviderDom({ withPagination: true });
        const dp = new TestDataprovider('dp');
        // Add a perpage selector to the pagination element.
        const selector = document.createElement('select');
        selector.id = 'dp-pagination-perpage';
        const option10 = new Option('10', '10');
        const option50 = new Option('50', '50');
        selector.append(option10);
        selector.append(option50);
        document.getElementById('dp-pagination')!.setAttribute('data-perpage-selector-ID', selector.id);
        document.getElementById('dp-pagination')!.append(selector);

        dp.queueFetchResponse({ items: [], pagination: { page: 1, perpage: 10, pages: 20 } });
        await dp.init();
        (dp as any).page = 15;
        (dp as any).perpage = 10;

        selector.value = '50';
        dp.queueFetchResponse({ items: [], pagination: { page: 1, perpage: 50, pages: 4 } });
        await (dp as any).perPageChangeEvent();

        expect((dp as any).page).toBe(1);
        expect((dp as any).perpage).toBe(50);
    });
});
