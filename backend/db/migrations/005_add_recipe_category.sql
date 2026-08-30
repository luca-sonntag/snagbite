-- Migration 005: Add category column to recipes table for meal type categorization
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'recipes' and column_name = 'category'
  ) then
    alter table public.recipes add column category text;
  end if;
end $$;

-- Index for category-based filtering
create index if not exists idx_recipes_category on public.recipes(category)
  where category is not null;
