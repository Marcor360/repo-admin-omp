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

# Install tsx to run the server in production
RUN npm install -g tsx

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["tsx", "src/server/index.ts"]
