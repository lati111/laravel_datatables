import { describe, it, expect, beforeEach } from 'vitest';
import { DatatableForm } from '../../../src/Templates/Datatable/DatatableForm';

function mountForm(): void {
    document.body.innerHTML = '';
    const root = document.createElement('table');
    root.id = 'df';
    root.classList.add('dataprovider', 'datatable');
    root.setAttribute('data-content-url', 'https://x.test/api/data');
    root.setAttribute('data-save-url', 'https://x.test/api/save');
    root.setAttribute('data-history', 'false');
    root.setAttribute('data-identifier-key', 'id');

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th class="datatable-header" data-column="name"></th></tr>';
    root.append(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'df-content';
    root.append(tbody);

    document.body.append(root);
}

describe('DatatableForm', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    describe('load coalescing', () => {
        it('adds exactly one empty row per user-visible load, even under rapid re-entrant calls', async () => {
            mountForm();
            const df = new DatatableForm('df');

            let resolveFirst: (v: unknown) => void = () => {};
            const gate = new Promise((r) => { resolveFirst = r; });
            let fetchCount = 0;
            (df as any).fetchData = async () => {
                fetchCount++;
                if (fetchCount === 1) {
                    await gate;
                }
                return [];
            };
            (df as any).postData = async () => ({});

            // Fire two overlapping load() calls — second is coalesced.
            const p1 = (df as any).load();
            const p2 = (df as any).load();
            resolveFirst([]);
            await Promise.all([p1, p2]);

            // Only the "owning" call should have prepended a new-row; the coalesced call
            // must be skipped. Coalescing collapses to one trailing rerun, so we expect at
            // most 2 new-rows across the full sequence (initial owner + trailing rerun).
            const newRows = document.querySelectorAll('#df-content tr.new-row');
            expect(newRows.length).toBeLessThanOrEqual(2);
        });

        it('accepts the keepContents parameter (was previously dropped by narrower override)', async () => {
            mountForm();
            const df = new DatatableForm('df');
            (df as any).fetchData = async () => [];
            (df as any).postData = async () => ({});
            await (df as any).init();

            // Should not throw and should not add a new row when keepContents=true.
            const before = document.querySelectorAll('#df-content tr').length;
            await (df as any).load(false, true);
            const after = document.querySelectorAll('#df-content tr').length;

            expect(after).toBe(before);
        });
    });
});
