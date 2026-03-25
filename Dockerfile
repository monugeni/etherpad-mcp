FROM etherpad/etherpad:latest

USER root

RUN apk add --no-cache supervisor

# Copy and build MCP server
WORKDIR /opt/mcp
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build && rm -rf node_modules && npm install --omit=dev

# Supervisor config to run both processes
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

USER etherpad
WORKDIR /opt/etherpad-lite

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
