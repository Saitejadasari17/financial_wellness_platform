FROM node:20-alpine

WORKDIR /app

# Build context is repository root; frontend app lives in /frontend.
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Render provides PORT at runtime; default to 3000 locally
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
