ARG NODE_IMAGE=node:20-bookworm-slim
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs20-debian12:nonroot

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM ${RUNTIME_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=builder --chown=65532:65532 /app/public ./public

EXPOSE 3000

CMD ["server.js"]
