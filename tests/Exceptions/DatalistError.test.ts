import { describe, it, expect } from 'vitest';
import { DatalistError } from '../../src/Exceptions/DatalistError';
import { DatalistConstructionError } from '../../src/Exceptions/DatalistConstructionError';
import { DatalistFilterError } from '../../src/Exceptions/DatalistFilterError';
import { DatalistLoadingError } from '../../src/Exceptions/DatalistLoadingError';

describe('DatalistError callback invocation', () => {
    it('invokes the provided callback with the message before throwing', () => {
        const seen: string[] = [];
        const callback = (msg: string) => { seen.push(msg); };

        expect(() => { throw new DatalistError('boom', callback); }).toThrow('boom');
        expect(seen).toEqual(['boom']);
    });

    it('is safe when no callback is provided', () => {
        expect(() => { throw new DatalistError('boom'); }).toThrow('boom');
    });

    it.each([
        ['DatalistConstructionError', DatalistConstructionError],
        ['DatalistFilterError', DatalistFilterError],
        ['DatalistLoadingError', DatalistLoadingError],
    ])('subclass %s inherits callback behavior', (_name, Ctor) => {
        const seen: string[] = [];
        const callback = (msg: string) => { seen.push(msg); };

        expect(() => { throw new Ctor('kaboom', callback); }).toThrow('kaboom');
        expect(seen).toEqual(['kaboom']);
    });

    it('subclasses remain instanceof DatalistError so consumers can catch them centrally', () => {
        const e = new DatalistConstructionError('x');
        expect(e).toBeInstanceOf(DatalistError);
        expect(e).toBeInstanceOf(Error);
    });
});
