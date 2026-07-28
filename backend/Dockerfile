# --- deps: install once, reused by both the build and runtime stages ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript to JS ---
FROM deps AS build
COPY . .
RUN npm run build

# --- runtime: slim image with only production deps + compiled output ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
