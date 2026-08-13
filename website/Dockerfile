# Stage 1: Build the Vite React app
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build arguments passed by Railway or Docker build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL

# Pass them as environment variables into the Vite build process
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a custom nginx configuration template to handle dynamic PORT mapping from Railway
RUN mkdir -p /etc/nginx/templates
RUN echo 'server { \
    listen ${PORT}; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Default port fallback if PORT env var is not set (e.g., local run)
ENV PORT=80

# Expose the port (expose is informational, Railway reads PORT env var)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
