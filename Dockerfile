# ── Build stage: compile the backend TypeScript ─────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
COPY healthcheck/package*.json healthcheck/
COPY website/package*.json website/
COPY shared/package*.json shared/

# Install dependencies for the workspaces
RUN YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install

# Build backend
COPY backend/tsconfig.json backend/
COPY backend/src/ backend/src/
RUN npm run build -w backend
RUN npm prune --omit=dev --workspace=backend

# ── Production stage: minimal runtime ──────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy production dependencies and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist

# Install runtime dependencies (ffmpeg/ffprobe for frame extraction, python3 for yt-dlp, ttf-dejavu for text-drawing fonts)
RUN apk add --no-cache ffmpeg python3 ttf-dejavu

# Create directories for runtime artifacts
RUN mkdir -p logs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]