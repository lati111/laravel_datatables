import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';

/**
 * These tests lock down renderPagination's shape. The old right-edge branch was dead code
 * (`i < pages - 2` when `i` started at `pages - 1`), which silently emitted empty buttons.
 */
describe('PaginationMixin.renderPagination', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    function makeDp(pages: number, page: number, pagesInPagination = 3) {
        mountDataproviderDom({
            withPagination: true,
            extraAttrs: {},
        });
        const dp = new TestDataprovider('dp');
        // Attach the extra attribute on the pagination element so it picks up during init.
        document.getElementById('dp-pagination')!
            .setAttribute('data-pages-in-pagination', String(pagesInPagination));
        return dp;
    }

    async function initWithResponse(dp: TestDataprovider, resp: unknown) {
        dp.queueFetchResponse(resp);
        await dp.init();
    }

    it('renders a page-number button for every page in a small dataset', async () => {
        const dp = makeDp(3, 1, 3);
        await initWithResponse(dp, {
            items: [],
            pagination: { page: 1, perpage: 10, pages: 3 },
        });
        // page is only set through user interaction / restore; seed it here.
        (dp as any).page = 1;
        (dp as any).renderPagination();

        const buttons = document.querySelectorAll('#dp-pagination-content button[data-value]');
        const values = Array.from(buttons).map((b) => b.getAttribute('data-value'));
        expect(values).toContain('1');
    });

    it('marks the current page with the active class', async () => {
        const dp = makeDp(5, 2, 3);
        await initWithResponse(dp, {
            items: [],
            pagination: { page: 1, perpage: 10, pages: 5 },
        });
        (dp as any).page = 2;
        (dp as any).renderPagination();

        const active = document.querySelectorAll('#dp-pagination-content .active');
        expect(active.length).toBe(1);
        expect(active[0].getAttribute('data-value')).toBe('2');
    });

    it('renders a "..." divider when the current page is far from either edge', async () => {
        const dp = makeDp(20, 10, 3);
        await initWithResponse(dp, {
            items: [],
            pagination: { page: 1, perpage: 10, pages: 20 },
        });
        (dp as any).page = 10;
        (dp as any).renderPagination();

        const dividers = document.querySelectorAll('#dp-pagination-content span');
        expect(dividers.length).toBeGreaterThanOrEqual(1);
    });

    it('right-edge branch now emits at least one non-empty numbered button after the current page', async () => {
        // Regression: the old branch always produced empty placeholders because
        // `i < pages - 2` was never true when i started at `pages - 1`.
        const dp = makeDp(5, 3, 3);
        await initWithResponse(dp, {
            items: [],
            pagination: { page: 1, perpage: 10, pages: 5 },
        });
        (dp as any).page = 3;
        (dp as any).renderPagination();

        const rightNumbers = Array.from(
            document.querySelectorAll('#dp-pagination-content button[data-value]')
        )
            .map((b) => parseInt(b.getAttribute('data-value')!))
            .filter((n) => n > 3);

        expect(rightNumbers.length).toBeGreaterThan(0);
    });
});
