FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

FROM base AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

FROM base AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=builder /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
