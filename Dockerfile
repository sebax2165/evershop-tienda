# ==============================================================
# Stage 1: Builder - install all deps, compile, and build
# ==============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY packages/evershop/package.json packages/evershop/package.json
COPY packages/postgres-query-builder/package.json packages/postgres-query-builder/package.json
COPY packages/create-evershop-app/package.json packages/create-evershop-app/package.json
COPY extensions/one-step-checkout/package.json extensions/one-step-checkout/package.json
COPY extensions/tracking-pixels/package.json extensions/tracking-pixels/package.json
COPY extensions/dropi-integration/package.json extensions/dropi-integration/package.json

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy remaining source code
COPY . .

# Compile packages
RUN npm run compile:db
RUN npm run compile

# Compile extensions
RUN cd extensions/one-step-checkout && npx swc ./src/ -d dist/ --config-file .swcrc --copy-files --strip-leading-paths
RUN cd extensions/tracking-pixels && npx swc ./src/ -d dist/ --config-file .swcrc --copy-files --strip-leading-paths
RUN cd extensions/dropi-integration && npx swc ./src/ -d dist/ --config-file .swcrc --copy-files --strip-leading-paths

# Build (webpack bundle, generates .evershop/)
RUN npm run build

# ==============================================================
# Stage 2: Runtime - production image with only what's needed
# ==============================================================
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/evershop/package.json packages/evershop/package.json
COPY packages/postgres-query-builder/package.json packages/postgres-query-builder/package.json
COPY packages/create-evershop-app/package.json packages/create-evershop-app/package.json
COPY extensions/one-step-checkout/package.json extensions/one-step-checkout/package.json
COPY extensions/tracking-pixels/package.json extensions/tracking-pixels/package.json
COPY extensions/dropi-integration/package.json extensions/dropi-integration/package.json

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled packages from builder
COPY --from=builder /app/packages/evershop/dist/ packages/evershop/dist/
COPY --from=builder /app/packages/postgres-query-builder/dist/ packages/postgres-query-builder/dist/

# Copy compiled extensions (dist + config files)
COPY --from=builder /app/extensions/one-step-checkout/dist/ extensions/one-step-checkout/dist/
COPY --from=builder /app/extensions/one-step-checkout/.swcrc extensions/one-step-checkout/.swcrc
COPY --from=builder /app/extensions/tracking-pixels/dist/ extensions/tracking-pixels/dist/
COPY --from=builder /app/extensions/tracking-pixels/.swcrc extensions/tracking-pixels/.swcrc
COPY --from=builder /app/extensions/dropi-integration/dist/ extensions/dropi-integration/dist/
COPY --from=builder /app/extensions/dropi-integration/.swcrc extensions/dropi-integration/.swcrc

# Copy built webpack output
COPY --from=builder /app/.evershop/ .evershop/

# Copy runtime config and translations
COPY config/ config/
COPY translations/ translations/

# Create directories for themes, public assets, and media (volume mount)
RUN mkdir -p themes public media

EXPOSE 3000
CMD ["npm", "run", "start"]
