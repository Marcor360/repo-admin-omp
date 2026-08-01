FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run typecheck

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/tsconfig.json ./

# Keep the production runtime aligned with the tested project dependency.
RUN npm install -g tsx@4.21.0

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["tsx", "src/server/index.ts"]
