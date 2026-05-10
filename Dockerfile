FROM node:20-alpine

WORKDIR /app

# Install dependencies from frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Render provides PORT at runtime; default to 3000 locally
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
