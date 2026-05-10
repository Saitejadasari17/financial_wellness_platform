FROM node:20-alpine

WORKDIR /app

# Build context is set to frontend on Render.
COPY package.json ./
COPY package-lock.json* ./
RUN npm install

# Copy app source from current context
COPY . ./

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Render provides PORT at runtime; default to 3000 locally
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
