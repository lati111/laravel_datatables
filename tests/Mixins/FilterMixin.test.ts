import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';
import { DatalistFilterError } from '../../src/Exceptions/DatalistFilterError';
import { Filter } from '../../src/Data/Filter';

describe('FilterMixin', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('getFilters', () => {
        it('does not mutate this.filters when re-derived checkbox filters exist', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            (dp as any).initBody();

            // Seed with a manual (persistent) filter and simulate a checkbox filter having
            // been persisted from a previous call — that entry MUST be pruned but the
            // manual filter must survive.
            (dp as any).filters = [
                new Filter('manual', 'status', '=', 'active'),
                new Filter('checkbox', 'is_active', '=', '1'),
            ];

            // Add a checkbox to the DOM so getFilters() can re-derive it.
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.name = 'is_active';
            cb.classList.add('dp-filter-checkbox');
            cb.setAttribute('data-checked-operator', '=');
            cb.setAttribute('data-checked-value', '1');
            cb.checked = true;
            document.body.append(cb);

            const filters = (dp as any).getFilters();

            // Persistent state should only contain non-derived types now.
            expect((dp as any).filters.every((f: Filter) => f.type === 'manual')).toBe(true);
            // Returned array is a fresh copy, not the same reference.
            expect(filters).not.toBe((dp as any).filters);
            // Both filters end up in the returned list (1 manual + 1 checkbox).
            expect(filters.length).toBe(2);
        });

        it('deduplicates on repeated calls — checkbox filter is not multiplied', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            (dp as any).initBody();

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.name = 'flag';
            cb.classList.add('dp-filter-checkbox');
            cb.setAttribute('data-checked-operator', '=');
            cb.setAttribute('data-checked-value', '1');
            cb.checked = true;
            document.body.append(cb);

            const first = (dp as any).getFilters();
            const second = (dp as any).getFilters();
            const third = (dp as any).getFilters();

            expect(first.length).toBe(1);
            expect(second.length).toBe(1);
            expect(third.length).toBe(1);
        });
    });

    describe('addFilter duplicate protection', () => {
        it('throws a DatalistFilterError (not a bare Error) on duplicates', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            (dp as any).initBody();
            (dp as any).filters = [new Filter('form', 'status', '=', 'x', 'Status is x')];

            expect(() => (dp as any).addFilter('Status is x', 'status', '=', 'x'))
                .toThrow(DatalistFilterError);
        });
    });

    describe('buildFilterUrl', () => {
        it('appends /filters exactly once even when called repeatedly', () => {
            mountDataproviderDom({ contentUrl: 'https://x.test/api/data' });
            const dp = new TestDataprovider('dp');

            const first = (dp as any).buildFilterUrl();
            const dp2 = new TestDataprovider('dp');
            (dp2 as any).url = first; // pretend the URL already ends with /filters
            const second = (dp2 as any).buildFilterUrl();

            expect(new URL(first).pathname.endsWith('/filters')).toBe(true);
            expect(new URL(second).pathname.endsWith('/filters')).toBe(true);
            expect(new URL(second).pathname.includes('/filters/filters')).toBe(false);
        });

        it('preserves existing query parameters on the base URL', () => {
            mountDataproviderDom({ contentUrl: 'https://x.test/api/data?tenant=42' });
            const dp = new TestDataprovider('dp');
            const url = new URL((dp as any).buildFilterUrl('status'));
            expect(url.searchParams.get('tenant')).toBe('42');
            expect(url.searchParams.get('filter')).toBe('status');
        });
    });

    describe('addManualFilter', () => {
        it('records a manual filter, no reload when init=true', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            (dp as any).initBody();

            const before = dp.fetchCalls.length;
            dp.addManualFilter('status', '=', 'active', true);
            expect((dp as any).filters.length).toBe(1);
            expect(dp.fetchCalls.length).toBe(before);
        });
    });
});
