# Prepared Home public demo: a copy-only image. Nothing is compiled or installed here.
# The artifact is prebuilt on the dev PC and committed: release/artifact/{server.mjs, web/, samples/, cache/}.
FROM node:24-alpine

WORKDIR /app

COPY release/artifact/ /app/

ENV NODE_ENV=production \
    PORT=8787 \
    WEB_DIST=/app/web

USER node

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/v1/health > /dev/null || exit 1

CMD ["node", "--max-old-space-size=768", "server.mjs"]
