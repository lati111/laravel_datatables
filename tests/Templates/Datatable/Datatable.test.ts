import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Datatable } from '../../../src/Templates/Datatable/Datatable';
import { DatalistConstructionError } from '../../../src/Exceptions/DatalistConstructionError';

/** Mounts a minimal Datatable DOM shell with configurable options. */
function mountDatatable(opts: { selectionMode?: boolean; identifierKey?: string | null } = {}): void {
    document.body.innerHTML = '';
    const root = document.createElement('table');
    root.id = 'dt';
    root.classList.add('dataprovider', 'datatable');
    root.setAttribute('data-content-url', 'https://x.test/api/data');
    root.setAttribute('data-history', 'false');
    if (opts.selectionMode) {
        root.setAttribute('data-selection-mode', 'true');
    }
    if (opts.identifierKey !== undefined && opts.identifierKey !== null) {
        root.setAttribute('data-identifier-key', opts.identifierKey);
    }

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th class="datatable-header" data-column="name"></th></tr>';
    root.append(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'dt-content';
    root.append(tbody);

    document.body.append(root);
}

describe('Datatable', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('setupSelectionMode', () => {
        it('throws when data-selection-mode is true but data-identifier-key is missing', async () => {
            mountDatatable({ selectionMode: true, identifierKey: null });
            const dt = new Datatable('dt');
            (dt as any).fetchData = async () => [];
            (dt as any).postData = async () => ({});

            await expect((dt as any).init()).rejects.toThrow(DatalistConstructionError);
        });

        it('does not throw when identifier key is present', async () => {
            mountDatatable({ selectionMode: true, identifierKey: 'id' });
            const dt = new Datatable('dt');
            (dt as any).fetchData = async () => [];
            (dt as any).postData = async () => ({});

            await expect((dt as any).init()).resolves.toBeUndefined();
        });

        it('is a no-op when selection mode is not enabled', async () => {
            mountDatatable({ selectionMode: false });
            const dt = new Datatable('dt');
            (dt as any).fetchData = async () => [];
            (dt as any).postData = async () => ({});
            await expect((dt as any).init()).resolves.toBeUndefined();
        });
    });

    describe('loadDataFromStorage — sort state', () => {
        it('applies valid sort JSON', async () => {
            mountDatatable();
            // Make the header sortable.
            document.querySelector('th.datatable-header')!.setAttribute('data-sortable', 'true');
            const dt = new Datatable('dt');
            (dt as any).fetchData = async () => [];
            (dt as any).postData = async () => ({});
            await (dt as any).init();

            (dt as any).loadDataFromStorage({ sort: JSON.stringify({ name: 'asc' }) });

            const header = document.querySelector('th.datatable-header') as HTMLElement;
            expect(header.getAttribute('data-sort-dir')).toBe('asc');
        });

        it('warns and skips when sort JSON is malformed instead of crashing', async () => {
            mountDatatable();
            document.querySelector('th.datatable-header')!.setAttribute('data-sortable', 'true');
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const dt = new Datatable('dt');
            (dt as any).fetchData = async () => [];
            (dt as any).postData = async () => ({});
            await (dt as any).init();

            expect(() =>
                (dt as any).loadDataFromStorage({ sort: '{not-json' })
            ).not.toThrow();
            expect(warn).toHaveBeenCalled();

            warn.mockRestore();
        });
    });
});
