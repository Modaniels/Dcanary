# Multi-stage build for smaller final image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Final stage
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mody -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create global symlink
RUN npm link

# Switch to non-root user
USER mody

# Create config directory
RUN mkdir -p ~/.mody-cli/logs

# Set entrypoint
ENTRYPOINT ["mody"]

# Default command
CMD ["--help"]
