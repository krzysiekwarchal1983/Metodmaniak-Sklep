FROM node:22-bookworm-slim AS app
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL=
ENV NODE_ENV=production PORT=8080 BASE_PATH=/ \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
    VITE_CLERK_PROXY_URL=${VITE_CLERK_PROXY_URL}
RUN pnpm --filter @workspace/metodmaniak run build \
 && pnpm --filter @workspace/api-server run build
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
