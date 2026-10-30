import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPackageRecommendation } from '../shoppingItemUtils';

describe('shoppingItemUtils - getPackageRecommendation', () => {
  it('returns null when pkgAmount is invalid or missing', () => {
    assert.equal(getPackageRecommendation(1, 'Stück', null, null), null);
    assert.equal(getPackageRecommendation(1, 'Stück', 0, 'g'), null);
    assert.equal(getPackageRecommendation(0, 'g', 500, 'g'), null);
  });

  it('filters out incompatible Stück vs Volume (Zitrone bug)', () => {
    // 1 Stück Zitrone should NOT recommend 200 ml Zitronensaft
    assert.equal(getPackageRecommendation(1, 'Stück', 200, 'ml'), null);
    assert.equal(getPackageRecommendation(2, 'Stück', 1, 'l'), null);
    assert.equal(getPackageRecommendation(250, 'ml', 1, 'Stück'), null);
  });

  it('allows valid Stück vs Mass package recommendations (e.g. Apfel)', () => {
    assert.equal(getPackageRecommendation(1, 'Stück', 1000, 'g'), '1 Pkg. (1000 g)');
  });

  it('calculates package count for matching mass units (e.g. veganes Skyr)', () => {
    assert.equal(getPackageRecommendation(400, 'g', 500, 'g'), '1 Pkg. (500 g)');
    assert.equal(getPackageRecommendation(500, 'g', 500, 'g'), null); // exact match -> null
    assert.equal(getPackageRecommendation(800, 'g', 500, 'g'), '2 Pkg. (1000 g)');
    assert.equal(getPackageRecommendation(1500, 'g', 500, 'g'), '3 Pkg. (1500 g)');
  });

  it('handles cross-unit metric mass conversions (g vs kg)', () => {
    assert.equal(getPackageRecommendation(500, 'g', 1, 'kg'), '1 Pkg. (1 kg)');
    assert.equal(getPackageRecommendation(1000, 'g', 1, 'kg'), null); // exact 1000g vs 1kg -> null
    assert.equal(getPackageRecommendation(2500, 'g', 1, 'kg'), '3 Pkg. (3 kg)');
  });

  it('handles cross-unit metric volume conversions (ml vs l)', () => {
    assert.equal(getPackageRecommendation(250, 'ml', 1, 'l'), '1 Pkg. (1 l)');
    assert.equal(getPackageRecommendation(1000, 'ml', 1, 'l'), null); // exact 1000ml vs 1l -> null
    assert.equal(getPackageRecommendation(1500, 'ml', 1, 'l'), '2 Pkg. (2 l)');
  });

  it('respects container names and pluralization', () => {
    assert.equal(getPackageRecommendation(2, 'Dose', 1, 'Dose'), '2 Dosen (2 Dose)');
    assert.equal(getPackageRecommendation(1, 'Glas', 1, 'Glas'), null); // exact match
    assert.equal(getPackageRecommendation(3, 'Glas', 1, 'Glas'), '3 Gläser (3 Glas)');
    assert.equal(getPackageRecommendation(2, 'Flasche', 1, 'Flasche'), '2 Flaschen (2 Flasche)');
    assert.equal(getPackageRecommendation(2, 'Becher', 1, 'Becher'), '2 Becher (2 Becher)');
    assert.equal(getPackageRecommendation(2, 'Bund', 1, 'Bund'), '2 Bünde (2 Bund)');
  });
});
