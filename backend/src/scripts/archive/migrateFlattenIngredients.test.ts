import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNestedGroupFormat, flattenIngredients } from './migrateFlattenIngredients.js';

describe('migrateFlattenIngredients', () => {
  it('detects nested group format correctly', () => {
    const nested = [
      {
        name: 'Sauce',
        items: [
          { name: 'Tomatenmark', amount: 2, unit: 'EL' },
          { name: 'Wasser', amount: 100, unit: 'ml' },
        ],
      },
    ];
    assert.strictEqual(isNestedGroupFormat(nested), true);

    const flat = [
      { name: 'Tomatenmark', amount: 2, unit: 'EL', section: 'Sauce' },
      { name: 'Wasser', amount: 100, unit: 'ml' },
    ];
    assert.strictEqual(isNestedGroupFormat(flat), false);
    assert.strictEqual(isNestedGroupFormat([]), false);
    assert.strictEqual(isNestedGroupFormat(null), false);
  });

  it('flattens nested ingredient groups and sets section when informative', () => {
    const input = [
      {
        name: 'Hauptzutaten',
        items: [
          { name: 'Hähnchenbrust', amount: 500, unit: 'g' },
          { name: 'Reis', amount: 200, unit: 'g' },
        ],
      },
      {
        name: 'Für die Sauce',
        items: [
          { name: 'Sojasauce', amount: 3, unit: 'EL' },
          { name: 'Honig', amount: 1, unit: 'EL', section: 'Bestehende Section' },
        ],
      },
    ];

    const flattened = flattenIngredients(input as any);
    assert.strictEqual(flattened.length, 4);

    // Hauptzutaten is generic -> section should be undefined
    assert.strictEqual(flattened[0].name, 'Hähnchenbrust');
    assert.strictEqual(flattened[0].section, undefined);

    assert.strictEqual(flattened[1].name, 'Reis');
    assert.strictEqual(flattened[1].section, undefined);

    // Für die Sauce is informative -> section should be preserved
    assert.strictEqual(flattened[2].name, 'Sojasauce');
    assert.strictEqual(flattened[2].section, 'Für die Sauce');

    // Existing section should NOT be overwritten
    assert.strictEqual(flattened[3].name, 'Honig');
    assert.strictEqual(flattened[3].section, 'Bestehende Section');
  });
});
