import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataprovider, mountDataproviderDom } from '../helpers';

describe('UrlMixin', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('generateDataUrl', () => {
        it('always includes schema=3', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            const url = dp.generateDataUrl();
            expect(url.searchParams.get('schema')).toBe('3');
        });

        it('encodes custom column names that contain reserved characters', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            dp.setCustomSelect('a,weird=name', true);
            dp.setCustomSelect('plain', false);

            const url = dp.generateDataUrl();
            const columns = url.searchParams.get('columns');
            expect(columns).toBe(`${encodeURIComponent('a,weird=name')}=1,plain=0`);
        });

        it('setCustomSelect(null) removes the override', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            dp.setCustomSelect('a', true);
            dp.setCustomSelect('a', null);
            const url = dp.generateDataUrl();
            expect(url.searchParams.get('columns')).toBeNull();
        });
    });

    describe('changeUrl', () => {
        it('replaces every occurrence of a placeholder token', () => {
            mountDataproviderDom({ contentUrl: '/api/[id]/nested/[id]/edges' });
            const dp = new TestDataprovider('dp');
            const changed = (dp as any).changeUrl(
                '/api/[id]/nested/[id]/edges',
                { '[id]': '42' }
            );
            expect(changed).toBe('/api/42/nested/42/edges');
        });

        it('supports multiple placeholders in the same URL', () => {
            mountDataproviderDom();
            const dp = new TestDataprovider('dp');
            const changed = (dp as any).changeUrl(
                '/tenant/[tid]/user/[uid]',
                { '[tid]': 't-9', '[uid]': 'u-1' }
            );
            expect(changed).toBe('/tenant/t-9/user/u-1');
        });
    });

    describe('modifyUrl', () => {
        it('unblocks loading and triggers a load with resolved URL', async () => {
            mountDataproviderDom({
                contentUrl: '/api/user/[id]',
                extraAttrs: { 'data-dynamic-url': 'true' },
            });
            const dp = new TestDataprovider('dp');
            dp.queueFetchResponse([]);
            await dp.init();

            // Before modifyUrl(), dynamic-url should block the first load.
            expect(dp.fetchCalls.length).toBe(0);

            dp.queueFetchResponse([]);
            await dp.modifyUrl({ '[id]': '99' });

            expect(dp.fetchCalls[0]).toContain('/api/user/99');
        });
    });
});
