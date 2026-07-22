import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider } from './helpers';
import { DatalistConstructionError } from '../src/Exceptions/DatalistConstructionError';

describe('DataproviderCore — empty id guard', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('throws a DatalistConstructionError when the dataprovider element has no id', () => {
        const el = document.createElement('div');
        el.classList.add('dataprovider');
        el.setAttribute('data-content-url', '/api/data');
        document.body.append(el);

        expect(() => new TestDataprovider(el))
            .toThrow(DatalistConstructionError);
    });
});
