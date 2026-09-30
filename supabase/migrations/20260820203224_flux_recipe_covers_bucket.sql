-- Migration: Add public recipe-covers storage bucket for FLUX.1 schnell generated images

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-covers', 'recipe-covers', true)
ON CONFLICT (id) DO NOTHING;
