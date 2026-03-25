FROM node:22-alpine AS builder
WORKDIR /opt/mcp
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM etherpad/etherpad:latest
USER root
RUN apk add --no-cache supervisor pandoc py3-weasyprint ttf-freefont
COPY abiword-pandoc.sh /usr/local/bin/abiword
RUN chmod +x /usr/local/bin/abiword

WORKDIR /opt/mcp
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --from=builder /opt/mcp/dist dist/

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

USER etherpad
WORKDIR /opt/etherpad-lite
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
