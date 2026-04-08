FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY package.json package-lock.json* ./

RUN npm ci && npm cache clean --force

COPY . .

RUN mkdir -p uploads \
    && chown -R appuser:appgroup /app

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

USER appuser

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
