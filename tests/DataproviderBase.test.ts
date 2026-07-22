import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom, tick } from './helpers';

describe('DataproviderBase', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('performLoad — happy path', () => {
        it('renders items returned by fetchData', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([
                { id: '1', label: 'Alice' },
                { id: '2', label: 'Bob' },
            ]);
            await dp.init();

            const items = document.querySelectorAll('.test-item');
            expect(items.length).toBe(2);
            expect(items[0].textContent).toBe('Alice');
        });

        it('unwraps a schema v3 envelope and picks up pagination.pages', async () => {
            mountDataproviderDom({ withPagination: true });
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse({
                items: [{ id: '1', label: 'One' }],
                pagination: { page: 1, perpage: 10, pages: 42 },
            });
            await dp.init();

            expect((dp as any).pages).toBe(42);
            expect(document.querySelectorAll('.test-item').length).toBe(1);
        });

        it('renders emptyBody HTML when no items are returned', async () => {
            mountDataproviderDom({
                extraAttrs: { 'data-empty-body': '<div class="no-results">Empty</div>' },
            });
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([]);
            await dp.init();

            expect(document.querySelector('.no-results')).not.toBeNull();
        });

        it('always adds ?schema=3 to the fetch URL', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([]);
            await dp.init();

            expect(dp.fetchCalls[0]).toContain('schema=3');
        });
    });

    describe('performLoad — error handling', () => {
        it('clears skeleton placeholders and resets loading state when fetch rejects', async () => {
            mountDataproviderDom({ withSkeleton: true, skeletonCount: 3 });
            const dp = new TestDataprovider('dp');
            dp.shouldRejectFetch = new Error('network dead');

            await expect(dp.init()).rejects.toThrow('network dead');
            await tick();

            const skeletons = document.querySelectorAll('.datalist-skeleton');
            expect(skeletons.length).toBe(0);
            expect((dp as any).loading).toBe(false);
        });

        it('removes disabled attribute from disableContainer after fetch rejects', async () => {
            document.body.innerHTML = '';
            const root = document.createElement('div');
            root.id = 'dp';
            root.classList.add('dataprovider');
            root.setAttribute('data-content-url', '/api/data');
            root.setAttribute('data-history', 'false');

            const disableContainer = document.createElement('div');
            disableContainer.id = 'dp-disable-container';
            root.append(disableContainer);

            const body = document.createElement('div');
            body.id = 'dp-content';
            disableContainer.append(body);

            document.body.append(root);

            const dp = new TestDataprovider('dp');
            dp.shouldRejectFetch = new Error('boom');

            await expect(dp.init()).rejects.toThrow('boom');
            expect(disableContainer.hasAttribute('disabled')).toBe(false);
        });
    });

    describe('load coalescing', () => {
        it('collapses multiple concurrent load() calls into a trailing rerun', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');

            let resolveFirst: (v: unknown) => void;
            const first = new Promise((res) => { resolveFirst = res; });
            const originalFetch = dp.fetchData.bind(dp);
            let calls = 0;
            dp.fetchData = async (url: string) => {
                calls++;
                if (calls === 1) {
                    await first;
                }
                return [];
            };

            const p1 = dp.load();
            const p2 = dp.load(true);
            const p3 = dp.load();
            resolveFirst!([]);

            await Promise.all([p1, p2, p3]);
            // The first fetch + one trailing load = 2 fetches, not 3.
            expect(calls).toBe(2);
        });
    });

    describe('destroy', () => {
        it('detaches the popstate handler', async () => {
            mountDataproviderDom({ extraAttrs: { 'data-history': 'true' } });
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([]);
            await dp.init();

            const before = dp.fetchCalls.length;
            dp.destroy();
            window.dispatchEvent(new PopStateEvent('popstate'));
            await tick();

            expect(dp.fetchCalls.length).toBe(before);
        });
    });
});
