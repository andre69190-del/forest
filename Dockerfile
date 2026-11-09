# BIOGLOW Forest — Build im Container, Auslieferung mit nginx (Muster: ARDOC + Polski Szlak).
# Coolify: Build Pack "Dockerfile", Port 80, Domain forest.arndt-software.de.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Optional: Pl@ntNet-Schlüssel als Build-Variable aus Coolify (landet – wie bei BIOGLOW – im ausgelieferten Code)
ARG VITE_PLANTNET_KEY=
ENV VITE_PLANTNET_KEY=$VITE_PLANTNET_KEY
RUN npm run build && npx vitest run

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx-container.conf /etc/nginx/conf.d/forest.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
