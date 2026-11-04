FROM node:20-alpine

# Install pnpm - pinned so this layer's cache invalidates on version bumps and
# builds stay deterministic (avoids resolving a different pnpm each build, which
# previously kept an older cached pnpm around even after workspace config changes)
RUN npm install -g pnpm@10.33.0

WORKDIR /app

# For monorepos, copying everything early avoids broken module links
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages

# Install all dependencies, then build shared BEFORE the server.
# The server runs as plain compiled JS (see CMD below), so @qworship/shared has
# to exist as JS too — node cannot load the .ts sources, and resolving them is
# what produced ERR_UNKNOWN_FILE_EXTENSION on boot.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @qworship/shared build
RUN pnpm --filter @qworship/server build

# Set production context
ENV NODE_ENV=production

EXPOSE 5000

# Start compiled dist app
CMD ["node", "apps/server/dist/index.js"]
