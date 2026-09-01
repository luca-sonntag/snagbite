-- ============================================================================
-- 📊 AUSWERTUNG: Ingredient Mappings nach Kategorien
-- ============================================================================

-- 1. Gesamtauswertung nach Kategorie (Match-Rate, Konfidenz & Beispiele)
SELECT
    COALESCE(category, 'UNBEKANNT') AS category,
    COUNT(*) AS total_ingredients,
    COUNT(*) FILTER (WHERE resolution = 'matched') AS matched_off,
    COUNT(*) FILTER (WHERE resolution = 'no_match') AS estimated_only,
    ROUND(
        (COUNT(*) FILTER (WHERE resolution = 'matched')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
        1
    ) AS match_rate_pct,
    ROUND(AVG(confidence)::NUMERIC, 2) AS avg_confidence,
    COALESCE(SUM(hit_count), 0) AS total_cache_hits,
    (
        SELECT string_agg(sub.mapping_key, ', ')
        FROM (
            SELECT mapping_key
            FROM ingredient_mappings im2
            WHERE COALESCE(im2.category, '') = COALESCE(im1.category, '')
            ORDER BY im2.hit_count DESC, im2.mapping_key ASC
            LIMIT 5
        ) sub
    ) AS sample_keys
FROM ingredient_mappings im1
GROUP BY category
ORDER BY total_ingredients DESC;


-- 2. Detailprüfung: Welche Zutaten haben kein OFF-Match (no_match / Estimated)?
SELECT
    category,
    mapping_key,
    confidence,
    reasoning,
    updated_at
FROM ingredient_mappings
WHERE resolution = 'no_match'
ORDER BY category, mapping_key;


-- 3. Häufigste Zutaten pro Kategorie (nach Hit-Count / Verwendung)
SELECT
    category,
    mapping_key,
    product_code,
    resolution,
    hit_count,
    confidence
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY hit_count DESC, mapping_key ASC) AS rank
    FROM ingredient_mappings
) ranked
WHERE rank <= 5
ORDER BY category, rank;


-- 4. Kürzlich hinzugefügte Mappings (letzte 24 Stunden)
SELECT
    category,
    COUNT(*) AS added_last_24h,
    COUNT(*) FILTER (WHERE resolution = 'matched') AS matched_last_24h,
    COUNT(*) FILTER (WHERE resolution = 'no_match') AS estimated_last_24h
FROM ingredient_mappings
WHERE updated_at >= NOW() - INTERVAL '24 hours'
GROUP BY category
ORDER BY added_last_24h DESC;
