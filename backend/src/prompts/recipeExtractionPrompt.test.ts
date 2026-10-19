import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecipeExtractionSystemInstruction,
  buildRecipeExtractionUserPrompt,
  getPromptUnitInstructions,
} from './recipeExtractionPrompt.js';

test('recipeExtractionPrompt: buildRecipeExtractionSystemInstruction', async (t) => {
  await t.test('includes essential rules and default units', () => {
    const instruction = buildRecipeExtractionSystemInstruction();

    assert.ok(instruction.includes('You are an expert recipe extractor.'));
    assert.ok(instruction.includes('1. Recipe Existence & Anti-Hallucination:'));
    assert.ok(instruction.includes('2. Multi-Recipe Ambiguity:'));
    assert.ok(instruction.includes('15. Inline Ingredient Tagging:'));
    assert.ok(instruction.includes('17. Inline Timer Tagging:'));
    assert.ok(instruction.includes('23. Cooking Media & Discarded Liquids'));
    assert.ok(instruction.includes('24. Multi-Component Dishes & Sub-Recipe Grouping (section)'));
    // By default, photo source rules should not be included
    assert.ok(!instruction.includes('Special Handling for Photographed Physical Sources'));
  });

  await t.test('incorporates photo source rules when isPhotoSource is true', () => {
    const instruction = buildRecipeExtractionSystemInstruction(undefined, true);

    assert.ok(instruction.includes('Special Handling for Photographed Physical Sources (Cookbook / Card Photos):'));
    assert.ok(instruction.includes('The photos are pages/sides of ONE single recipe in the order given.'));
  });

  await t.test('applies user preferences for language and temperature units', () => {
    const instruction = buildRecipeExtractionSystemInstruction({
      recipeLanguage: 'English',
      preferredTemperatureUnit: 'Fahrenheit',
      preferredUnitSystem: 'imperial',
    });

    assert.ok(instruction.includes('into: English'));
    assert.ok(instruction.includes('preferred unit: Fahrenheit'));
    assert.ok(instruction.includes('preferred unit system: imperial'));
  });
});

test('recipeExtractionPrompt: buildRecipeExtractionUserPrompt', async (t) => {
  await t.test('constructs user payload with media, caption, and task', () => {
    const prompt = buildRecipeExtractionUserPrompt({
      caption: 'Leckere Pasta mit Knoblauch und Öl',
      visualContextClause: ' and an image showing a 4x4 grid of 16 chronological frames',
      htmlContent: '<p>Blog post content</p>',
    });

    assert.ok(prompt.includes('Attached Source Media:'));
    assert.ok(prompt.includes('16 chronological frames'));
    assert.ok(prompt.includes('Leckere Pasta mit Knoblauch und Öl'));
    assert.ok(prompt.includes('<p>Blog post content</p>'));
    assert.ok(prompt.includes('Task: Analyze the attached source content'));
  });

  await t.test('handles empty caption and HTML gracefully', () => {
    const prompt = buildRecipeExtractionUserPrompt({});

    assert.ok(!prompt.includes('Description/Caption:'));
    assert.ok(!prompt.includes('Website Content:'));
    assert.ok(!prompt.includes('Spoken Voiceover Transcript'));
    assert.ok(prompt.includes('Task: Analyze the attached source content'));
  });

  await t.test('incorporates spoken voiceover transcript when provided', () => {
    const prompt = buildRecipeExtractionUserPrompt({
      caption: 'Quick reel caption',
      transcript: 'Nehmt 200g Mehl und 2 Eier, verquirlt das Ganze gut.',
    });

    assert.ok(prompt.includes('Spoken Voiceover Transcript (from Video Audio):'));
    assert.ok(prompt.includes('Nehmt 200g Mehl und 2 Eier'));
    assert.ok(prompt.includes('Quick reel caption'));
  });
});

