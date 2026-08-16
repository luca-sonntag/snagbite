import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_JSON_PATH = path.resolve(__dirname, '../data/canonicalIngredientsData.json');
const EMBEDDINGS_BIN_PATH = path.resolve(__dirname, '../data/canonicalEmbeddings.bin');
const EMBEDDINGS_META_PATH = path.resolve(__dirname, '../data/canonicalEmbeddingsMeta.json');

const MODEL_NAME = 'gemini-embedding-001';
const EMBEDDING_DIM = 3072;

async function main() {
  console.log(`=== Precomputing Google Gemini Text Embeddings (${MODEL_NAME}, ${EMBEDDING_DIM}-dim) ===`);

  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in environment!');
  }

  if (!fs.existsSync(DATA_JSON_PATH)) {
    throw new Error(`Data file not found: ${DATA_JSON_PATH}`);
  }

  const raw = fs.readFileSync(DATA_JSON_PATH, 'utf-8');
  const ingredients = JSON.parse(raw);
  const total = ingredients.length;
  console.log(`Loaded ${total} ingredients from ${DATA_JSON_PATH}`);

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const floatBuffer = new Float32Array(total * EMBEDDING_DIM);
  const idMap: string[] = [];

  const BATCH_SIZE = 80;
  const startTime = Date.now();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE);
    const requests = batch.map((item: any) => {
      const de = item.name_de || '';
      const aliases = (item.aliases || []).slice(0, 4).join(', ');
      const en = item.name_en || '';
      const text = `${de}. ${aliases}. ${en}`.trim();
      return {
        content: { role: 'user', parts: [{ text }] },
      };
    });

    let success = false;
    let retries = 5;
    let responseEmbeddings: any[] = [];

    while (!success && retries > 0) {
      try {
        const res = await model.batchEmbedContents({ requests });
        responseEmbeddings = res.embeddings;
        success = true;
      } catch (err: any) {
        retries--;
        const isRateLimit = err.message?.includes('429') || err.message?.includes('Quota');
        const waitMs = isRateLimit ? 15000 : 2000;
        console.warn(`[Retry ${5 - retries}] ${isRateLimit ? 'Rate limit (429)' : 'Batch error'} at offset ${i}. Waiting ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    if (!success) {
      throw new Error(`Failed to embed batch at offset ${i} after retries.`);
    }

    // Small delay to pace requests smoothly
    await new Promise((r) => setTimeout(r, 200));

    for (let j = 0; j < batch.length; j++) {
      const vector = responseEmbeddings[j].values;
      const globalIndex = i + j;
      floatBuffer.set(vector, globalIndex * EMBEDDING_DIM);
      idMap.push(batch[j].id);
    }

    const processed = Math.min(i + BATCH_SIZE, total);
    const percent = Math.round((processed / total) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${percent}%] Embedded ${processed}/${total} ingredients (${elapsed}s)...`);
  }

  // Save binary vector buffer
  const byteBuffer = Buffer.from(floatBuffer.buffer, floatBuffer.byteOffset, floatBuffer.byteLength);
  fs.writeFileSync(EMBEDDINGS_BIN_PATH, byteBuffer);
  console.log(`Wrote binary embeddings to: ${EMBEDDINGS_BIN_PATH} (${(byteBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

  // Save metadata
  const meta = {
    model: MODEL_NAME,
    dimension: EMBEDDING_DIM,
    totalItems: total,
    createdAt: new Date().toISOString(),
    idMap,
  };
  fs.writeFileSync(EMBEDDINGS_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`Wrote metadata index to: ${EMBEDDINGS_META_PATH}`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== Successfully precomputed all ${total} embeddings with Google ${MODEL_NAME} in ${totalTime}s! ===`);
}

main().catch((err) => {
  console.error('Fatal error precomputing embeddings:', err);
  process.exit(1);
});
