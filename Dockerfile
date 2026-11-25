# Production image for events-web. The API address is a build argument:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://<host>/api .
#
# Unlike bookings_web (static export served by nginx), events-web renders pages on every request and
# uses redirects, so it runs as a Node server with `next start`.
FROM node:24-slim AS builder
# Baked into the browser bundle at build time, like bookings_web's NEXT_PUBLIC_API_URL.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage. Dev dependencies are kept on purpose: next start loads next.config.ts. Slimming this
# (output: "standalone") is left for the real setup.
FROM node:24-slim
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=builder --chown=node:node /app ./
USER node

EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
