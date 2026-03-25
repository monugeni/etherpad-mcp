FROM etherpad/etherpad:latest

USER root

# Install build tools for npm
RUN apt-get update && apt-get install -y --no-install-recommends supervisor && rm -rf /var/lib/apt/lists/*

# Copy and build MCP server
WORKDIR /opt/mcp
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# Supervisor config to run both processes
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

USER etherpad
WORKDIR /opt/etherpad-lite

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
