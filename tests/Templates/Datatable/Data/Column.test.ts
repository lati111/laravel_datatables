import { describe, it, expect } from 'vitest';
import { Column } from '../../../../src/Templates/Datatable/Data/Column';

describe('Column.createCell', () => {
    it('renders plain values as textContent — never as HTML', () => {
        const col = new Column('name', 0);
        const cell = col.createCell({ name: '<script>alert(1)</script>' });

        // Should NOT contain a script element.
        expect(cell.querySelector('script')).toBeNull();
        // Text content should be the literal payload.
        expect(cell.textContent).toContain('<script>alert(1)</script>');
    });

    it('escapes the substituted value inside a format template', () => {
        const col = new Column('label', 0);
        col.format = '<span class="tag">[value]</span>';
        const cell = col.createCell({ label: '<img src=x onerror=alert(1)>' });

        // The wrapping span is trusted markup and MUST render as an element.
        expect(cell.querySelector('span.tag')).not.toBeNull();
        // The value must not create a real <img>.
        expect(cell.querySelector('img')).toBeNull();
        // Content of the wrapping span is the escaped text.
        expect(cell.querySelector('span.tag')!.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('uses the column default when data does not include the key', () => {
        const col = new Column('missing', 0);
        col.default = '—';
        const cell = col.createCell({});
        expect(cell.textContent).toBe('—');
    });

    it('applies visibility class when column is hidden', () => {
        const col = new Column('hidden', 0);
        col.visible = false;
        const cell = col.createCell({ hidden: 'v' });
        expect(cell.classList.contains('hidden')).toBe(true);
    });

    it('emits data-column attribute for downstream selectors', () => {
        const col = new Column('email', 0);
        const cell = col.createCell({ email: 'a@b.c' });
        expect(cell.getAttribute('data-column')).toBe('email');
    });
});
