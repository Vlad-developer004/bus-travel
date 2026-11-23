# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace apps/api --include-workspace-root

FROM deps AS build
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace apps/api --include-workspace-root --omit=dev

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/api

COPY --from=prod-deps /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/prisma ./prisma
COPY apps/api/prisma.config.ts apps/api/package.json ./

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/main.js"]
