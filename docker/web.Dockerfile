# Web Kwedo (Next.js), build multi-étapes, sortie « standalone ».
# L'adresse de l'API est lue à l'exécution par le proxy app/api/[...chemin]/route.ts (KWEDO_API).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules node_modules
COPY package.json package-lock.json ./
COPY apps/web apps/web
RUN npm --workspace apps/web run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3461 \
    KWEDO_API=http://api:3460
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static
COPY --from=build /app/apps/web/public apps/web/public
USER node
EXPOSE 3461
CMD ["node", "apps/web/server.js"]
