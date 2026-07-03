FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/bot/package.json apps/bot/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/bot apps/bot
RUN pnpm --filter @discord-bot/shared build
RUN pnpm --filter bot build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/apps/bot/package.json apps/bot/
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/apps/bot/dist apps/bot/dist
COPY --from=build /repo/packages/shared/dist packages/shared/dist
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
CMD ["node", "apps/bot/dist/index.js"]
