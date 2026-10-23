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
COPY --from=build /app/design-stitch/ankanu-v2/02-auth/screen.html design-stitch/ankanu-v2/02-auth/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/03-age-gate/screen.html design-stitch/ankanu-v2/03-age-gate/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/04-email-verification/screen.html design-stitch/ankanu-v2/04-email-verification/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/05-password-reset/screen.html design-stitch/ankanu-v2/05-password-reset/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/06-otp/screen.html design-stitch/ankanu-v2/06-otp/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/07-id-liveness/screen.html design-stitch/ankanu-v2/07-id-liveness/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/08-onboarding/screen.html design-stitch/ankanu-v2/08-onboarding/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/09-photo-rules/screen.html design-stitch/ankanu-v2/09-photo-rules/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/10-pin-lock/screen.html design-stitch/ankanu-v2/10-pin-lock/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/11-profile-edit/screen.html design-stitch/ankanu-v2/11-profile-edit/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/13-search/screen.html design-stitch/ankanu-v2/13-search/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/14-filters/screen.html design-stitch/ankanu-v2/14-filters/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/15-profile-detail/screen.html design-stitch/ankanu-v2/15-profile-detail/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/17-favourites/screen.html design-stitch/ankanu-v2/17-favourites/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/18-invite-compose-flash/screen.html design-stitch/ankanu-v2/18-invite-compose-flash/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/27-settings/screen.html design-stitch/ankanu-v2/27-settings/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/28-delete-export-status/screen.html design-stitch/ankanu-v2/28-delete-export-status/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/52-ts-visit-signals/screen.html design-stitch/ankanu-v2/52-ts-visit-signals/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/53-barre-de-navigation/screen.html design-stitch/ankanu-v2/53-barre-de-navigation/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/54-pseudonym-dob/screen.html design-stitch/ankanu-v2/54-pseudonym-dob/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/56-otp-alt/screen.html design-stitch/ankanu-v2/56-otp-alt/screen.html
COPY --from=build /app/design-stitch/ankanu-v2/57-discover/grid.html design-stitch/ankanu-v2/57-discover/grid.html
COPY --from=build /app/design-stitch/ankanu-v2/57-discover/screen.html design-stitch/ankanu-v2/57-discover/screen.html
ENV NODE_ENV=production
WORKDIR /app/apps/web
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
