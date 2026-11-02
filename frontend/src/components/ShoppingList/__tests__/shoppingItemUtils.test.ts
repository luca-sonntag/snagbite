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

  it('treats 1-2 single pieces as loose produce but recommends bulk bags for larger quantities', () => {
    // 1 single apple should be bought loose (no 1kg bulk bag recommendation)
    assert.equal(getPackageRecommendation(1, 'Stück', 1000, 'g'), null);
    assert.equal(getPackageRecommendation(2, 'Stück', 1000, 'g'), null);
    // 5 apples (bulk quantity) appropriately recommends a 1kg bag
    assert.equal(getPackageRecommendation(5, 'Stück', 1000, 'g'), '1 Pkg. (1000 g)');
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

  it('returns null for loose produce without packaging', () => {
    assert.equal(getPackageRecommendation(2, 'Stück', 1000, 'g', 'loose'), null);
    assert.equal(getPackageRecommendation(1, 'Stück', 200, 'g', 'loose'), null);
  });

  it('respects structured packagingType and pluralization in DE and EN', () => {
    assert.equal(getPackageRecommendation(800, 'g', 400, 'g', 'can'), '2 Dosen (800 g)');
    assert.equal(getPackageRecommendation(400, 'g', 400, 'g', 'can'), null); // exact match
    assert.equal(getPackageRecommendation(750, 'g', 250, 'g', 'jar'), '3 Gläser (750 g)');
    assert.equal(getPackageRecommendation(250, 'g', 250, 'g', 'jar'), null); // exact match
    assert.equal(getPackageRecommendation(1000, 'ml', 500, 'ml', 'bottle'), '2 Flaschen (1000 ml)');
    assert.equal(getPackageRecommendation(500, 'g', 250, 'g', 'tub'), '2 Becher (500 g)');
    assert.equal(getPackageRecommendation(2, 'Bund', 1, 'Bund', 'bunch'), '2 Bünde (2 Bund)');
    assert.equal(getPackageRecommendation(2, 'Stück', 1, 'Stück', 'piece'), '2 Stück (2 Stück)');

    // English localization
    assert.equal(getPackageRecommendation(800, 'g', 400, 'g', 'can', 'en'), '2 cans (800 g)');
    assert.equal(getPackageRecommendation(750, 'g', 250, 'g', 'jar', 'en'), '3 jars (750 g)');
    assert.equal(getPackageRecommendation(1000, 'ml', 500, 'ml', 'bottle', 'en'), '2 bottles (1000 ml)');
    assert.equal(getPackageRecommendation(500, 'g', 250, 'g', 'tub', 'en'), '2 tubs (500 g)');
  });

  it('correctly rounds up container fractions (e.g. 0.5 Dose Gehackte Tomaten -> 1 Dose)', () => {
    // 0.5 Dose canned tomatoes with 400g package size -> must buy 1 whole can (400g)
    assert.equal(getPackageRecommendation(0.5, 'Dose', 400, 'g', 'can'), '1 Dose (400 g)');
    assert.equal(getPackageRecommendation(0.5, 'Dose', 400, 'g', null), '1 Dose (400 g)');
    // 1.5 Dosen -> must buy 2 whole cans (800g)
    assert.equal(getPackageRecommendation(1.5, 'Dose', 400, 'g', 'can'), '2 Dosen (800 g)');
    // 0.5 Glas -> must buy 1 whole jar
    assert.equal(getPackageRecommendation(0.5, 'Glas', 250, 'g', 'jar'), '1 Glas (250 g)');
    // 0.5 Becher -> must buy 1 whole tub
    assert.equal(getPackageRecommendation(0.5, 'Becher', 200, 'g', 'tub'), '1 Becher (200 g)');
  });
});
