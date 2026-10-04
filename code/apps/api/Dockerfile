FROM node:24.21.0 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/kernel/package.json packages/kernel/package.json
COPY packages/ports/package.json packages/ports/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.21.0
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/kernel/package.json packages/kernel/package.json
COPY packages/ports/package.json packages/ports/package.json
RUN npm ci --omit=dev
COPY --from=build /app/packages/kernel/dist packages/kernel/dist
COPY --from=build /app/packages/ports/dist packages/ports/dist
COPY --from=build /app/apps/api/dist apps/api/dist
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
