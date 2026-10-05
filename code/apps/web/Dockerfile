FROM node:24.21.0 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/kernel/package.json packages/kernel/package.json
COPY packages/ports/package.json packages/ports/package.json
RUN npm ci
COPY . .
RUN npx tsc -p packages/kernel/tsconfig.json && npm run build --workspace @ankanu/web

FROM node:24.21.0
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/kernel/package.json packages/kernel/package.json
COPY packages/ports/package.json packages/ports/package.json
RUN npm ci --omit=dev
COPY --from=build /app/packages/kernel/dist packages/kernel/dist
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/app apps/web/app
COPY --from=build /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=build /app/design-stitch/11-auth/screen.html design-stitch/11-auth/screen.html
COPY --from=build /app/design-stitch/12-age-gate/screen.html design-stitch/12-age-gate/screen.html
COPY --from=build /app/design-stitch/13-email-verification/screen.html design-stitch/13-email-verification/screen.html
COPY --from=build /app/design-stitch/14-otp/screen.html design-stitch/14-otp/screen.html
ENV NODE_ENV=production
WORKDIR /app/apps/web
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
