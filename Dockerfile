# Step 1: install dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

# Step 2: build the Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./

RUN npm run build

# Step 3: keep only the files needed to run the app
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
