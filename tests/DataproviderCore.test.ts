import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from './helpers';
import { DatalistConstructionError } from '../src/Exceptions/DatalistConstructionError';

describe('DataproviderCore', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        it('resolves an element by id string', () => {
            mountDataproviderDom({ id: 'my-dp' });
            const dp = new TestDataprovider('my-dp');
            expect(dp.dataproviderID).toBe('my-dp');
        });

        it('throws a construction error when the id does not exist', () => {
            expect(() => new TestDataprovider('does-not-exist'))
                .toThrow(DatalistConstructionError);
        });

        it('throws when the element is missing the dataprovider class', () => {
            const el = document.createElement('div');
            el.id = 'orphan';
            el.setAttribute('data-content-url', '/x');
            document.body.append(el);

            expect(() => new TestDataprovider('orphan'))
                .toThrow(DatalistConstructionError);
        });

        it('throws when data-content-url is missing', () => {
            const el = document.createElement('div');
            el.id = 'no-url';
            el.classList.add('dataprovider');
            document.body.append(el);

            expect(() => new TestDataprovider('no-url'))
                .toThrow(DatalistConstructionError);
        });
    });

    describe('renderSkeleton', () => {
        it('does nothing when no skeleton template is present', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            (dp as any).initBody();
            dp.callRenderSkeleton();
            expect((dp as any).body.children.length).toBe(0);
        });

        it('clones an HTMLTemplateElement N times when data-skeleton-count is set', async () => {
            mountDataproviderDom({ withSkeleton: true, skeletonCount: 4 });
            const dp = new TestDataprovider('dp');
            await dp.init();
            dp.callRenderSkeleton();

            // init() already ran a load(); we ignore that. Just check skeleton would add 4 items.
            const bodyBefore = (dp as any).body.children.length;
            dp.callRenderSkeleton();
            const bodyAfter = (dp as any).body.children.length;
            expect(bodyAfter - bodyBefore).toBe(4);

            const skeletons = document.querySelectorAll('.datalist-skeleton');
            expect(skeletons.length).toBeGreaterThanOrEqual(4);
        });

        it('strips ids from cloned skeleton elements', async () => {
            mountDataproviderDom({ withSkeleton: true, skeletonCount: 2 });
            const dp = new TestDataprovider('dp');
            await dp.init();

            (dp as any).body.innerHTML = '';
            dp.callRenderSkeleton();

            const clones = (dp as any).body.querySelectorAll('*');
            for (const clone of clones) {
                expect(clone.id).toBe('');
            }
        });
    });

    describe('resolveElement', () => {
        it('returns null when the extra selector does not match', () => {
            mountDataproviderDom({ id: 'dp' });
            // spinner-ID resolves to a non-existent id; extra selector `.spinner` must fail.
            const dp = new TestDataprovider('dp');
            // No spinner in DOM — resolveElement should return null.
            expect((dp as any).resolveElement('data-spinner-ID', '-spinner', '.spinner')).toBeNull();
        });
    });

    describe('listen / destroy', () => {
        it('destroy() removes all listeners registered via listen()', async () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            let clicks = 0;
            const btn = document.createElement('button');
            document.body.append(btn);

            (dp as any).listen(btn, 'click', () => clicks++);
            btn.dispatchEvent(new Event('click'));
            expect(clicks).toBe(1);

            dp.destroy();
            btn.dispatchEvent(new Event('click'));
            expect(clicks).toBe(1);
        });
    });
});
