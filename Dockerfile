# Production Dockerfile for Cyne CLI
FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies needed for build
RUN npm install --legacy-peer-deps

# Copy source code and required files
COPY src/ ./src/
COPY tsconfig.json ./
COPY yoga.wasm ./
COPY cyne.cmd ./

# Install bun for building
RUN npm install -g bun

# Build the application
RUN bun build src/entrypoints/cli.tsx --minify --outfile cli.mjs --target=node

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only production files
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/cli.mjs ./
COPY --from=base /app/cyne.cmd ./
COPY --from=base /app/yoga.wasm ./

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cyne -u 1001

# Change ownership to non-root user
RUN chown -R cyne:nodejs /app
USER cyne

# Expose port 6556
EXPOSE 6556

# Set the entrypoint
ENTRYPOINT ["node", "cli.mjs"]
CMD ["--help"]