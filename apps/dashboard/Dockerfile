FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/dashboard apps/dashboard
RUN pnpm --filter @discord-bot/shared build
RUN pnpm --filter dashboard build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/apps/dashboard/package.json apps/dashboard/
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/apps/dashboard/.next apps/dashboard/.next
COPY --from=build /repo/apps/dashboard/public apps/dashboard/public
COPY --from=build /repo/apps/dashboard/next.config.js apps/dashboard/next.config.js
COPY --from=build /repo/packages/shared/dist packages/shared/dist
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
EXPOSE 3000
CMD ["pnpm", "--filter", "dashboard", "start"]
