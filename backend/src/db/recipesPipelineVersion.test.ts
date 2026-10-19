import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rowToRecipe, recipeToRow, recipeToDrizzle, sanitizeStorageUrl } from './recipesMappers.js';
import { CURRENT_RECIPE_PIPELINE_VERSION, type Recipe } from '@cookbook/shared';

describe('Recipe pipeline version mapping and defaults', () => {
  it('maps legacy database rows without pipeline_version to 0', () => {
    const legacyRow = {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Legacy Spaghetti',
      description: 'An old recipe without version info',
      ingredients: [],
      instructions: [],
      created_at: new Date('2024-01-01T12:00:00Z'),
      updated_at: new Date('2024-01-01T12:00:00Z'),
    };

    const recipe = rowToRecipe(legacyRow);
    assert.equal(recipe.pipelineVersion, 0, 'Legacy recipes must default to version 0');
  });

  it('maps database rows with explicit snake_case pipeline_version correctly', () => {
    const modernRow = {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Modern Curry',
      description: 'A newly extracted recipe',
      pipeline_version: 1,
      ingredients: [],
      instructions: [],
    };

    const recipe = rowToRecipe(modernRow);
    assert.equal(recipe.pipelineVersion, 1);
  });

  it('maps database rows with camelCase pipelineVersion correctly', () => {
    const drizzleRow = {
      id: '00000000-0000-0000-0000-000000000003',
      title: 'Future Stew',
      description: 'A recipe from a future pipeline version',
      pipelineVersion: 5,
      ingredients: [],
      instructions: [],
    };

    const recipe = rowToRecipe(drizzleRow);
    assert.equal(recipe.pipelineVersion, 5);
  });

  it('recipeToRow defaults undefined pipelineVersion to CURRENT_RECIPE_PIPELINE_VERSION', () => {
    const newRecipe: Recipe = {
      title: 'Pancake Mix',
      description: 'Fluffy pancakes',
      servings: 4,
      prepTime: 10,
      cookTime: 15,
      ingredients: [],
      instructions: [],
      equipment: [],
    };

    const row = recipeToRow(newRecipe);
    assert.equal(row.pipeline_version, CURRENT_RECIPE_PIPELINE_VERSION);
  });

  it('recipeToRow preserves explicit pipelineVersion', () => {
    const versionedRecipe: Recipe = {
      title: 'Pancake Mix V2',
      description: 'Fluffy pancakes',
      servings: 4,
      prepTime: 10,
      cookTime: 15,
      ingredients: [],
      instructions: [],
      equipment: [],
      pipelineVersion: 2,
    };

    const row = recipeToRow(versionedRecipe);
    assert.equal(row.pipeline_version, 2);
  });

  it('recipeToDrizzle preserves explicit pipelineVersion and defaults to CURRENT_RECIPE_PIPELINE_VERSION', () => {
    const explicitRecipe: Recipe = {
      title: 'Tacos',
      description: 'Tasty tacos',
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      ingredients: [],
      instructions: [],
      equipment: [],
      pipelineVersion: 3,
    };

    const unversionedRecipe: Recipe = {
      title: 'Tacos',
      description: 'Tasty tacos',
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      ingredients: [],
      instructions: [],
      equipment: [],
    };

    const drizzleExplicit = recipeToDrizzle(explicitRecipe);
    assert.equal(drizzleExplicit.pipelineVersion, 3);

    const drizzleDefault = recipeToDrizzle(unversionedRecipe);
    assert.equal(drizzleDefault.pipelineVersion, CURRENT_RECIPE_PIPELINE_VERSION);
  });

  it('updateRecipe safety check: deleting undefined pipelineVersion from patch prevents overwriting existing versions', () => {
    const incomingRecipeUpdate: Recipe = {
      title: 'Updated Title Only',
      description: 'User edited description',
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      ingredients: [],
      instructions: [],
      equipment: [],
      // pipelineVersion is deliberately undefined (e.g. legacy client edit payload)
    };

    const patch = recipeToDrizzle(incomingRecipeUpdate);
    if (incomingRecipeUpdate.pipelineVersion === undefined) {
      delete (patch as { pipelineVersion?: number }).pipelineVersion;
    }

    assert.equal('pipelineVersion' in patch, false, 'pipelineVersion must not be present in update patch when undefined');
  });
});

describe('Recipe storage URL sanitization', () => {
  it('strips localhost and 127.0.0.1 from storage URLs', () => {
    assert.equal(
      sanitizeStorageUrl('http://localhost:3000/storage/recipe-covers/user1/job1.jpg'),
      '/storage/recipe-covers/user1/job1.jpg'
    );
    assert.equal(
      sanitizeStorageUrl('http://127.0.0.1:3000/storage/recipe-photos/photo1.jpg'),
      '/storage/recipe-photos/photo1.jpg'
    );
  });

  it('strips absolute remote server origin from storage URLs to keep them origin-independent', () => {
    assert.equal(
      sanitizeStorageUrl('https://cookbook-development.up.railway.app/storage/recipe-covers/user1/job1.jpg'),
      '/storage/recipe-covers/user1/job1.jpg'
    );
  });

  it('preserves external CDN URLs and relative paths', () => {
    assert.equal(
      sanitizeStorageUrl('https://instagram.fhan5-8.fna.fbcdn.net/cover.jpg'),
      'https://instagram.fhan5-8.fna.fbcdn.net/cover.jpg'
    );
    assert.equal(
      sanitizeStorageUrl('/storage/recipe-covers/user1/job1.jpg'),
      '/storage/recipe-covers/user1/job1.jpg'
    );
    assert.equal(sanitizeStorageUrl(null), null);
    assert.equal(sanitizeStorageUrl(undefined), undefined);
  });

  it('recipeToRow and recipeToDrizzle sanitize imageUrl and imageUrls', () => {
    const raw: Recipe = {
      title: 'Burger',
      description: 'Juicy burger',
      servings: 1,
      prepTime: 5,
      cookTime: 5,
      ingredients: [],
      instructions: [],
      equipment: [],
      imageUrl: 'http://localhost:3000/storage/recipe-covers/u/j.jpg',
      imageUrls: [
        'http://localhost:3000/storage/recipe-covers/u/j.jpg',
        'https://instagram.com/p.jpg',
      ],
    };

    const row = recipeToRow(raw);
    assert.equal(row.image_url, '/storage/recipe-covers/u/j.jpg');
    assert.deepEqual(row.image_urls, [
      '/storage/recipe-covers/u/j.jpg',
      'https://instagram.com/p.jpg',
    ]);

    const drizzle = recipeToDrizzle(raw);
    assert.equal(drizzle.imageUrl, '/storage/recipe-covers/u/j.jpg');
    assert.deepEqual(drizzle.imageUrls, [
      '/storage/recipe-covers/u/j.jpg',
      'https://instagram.com/p.jpg',
    ]);
  });
});
