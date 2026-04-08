ARG NODE_IMAGE=node:20.20.2-alpine3.23

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk upgrade --no-cache \
    && npm install -g npm@11.12.1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk upgrade --no-cache \
    && npm install -g npm@11.12.1

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
