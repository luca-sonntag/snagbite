-- Migration 003: Rename legacy bls_code to product_code in ingredient_mappings
ALTER TABLE public.ingredient_mappings
  RENAME COLUMN bls_code TO product_code;
