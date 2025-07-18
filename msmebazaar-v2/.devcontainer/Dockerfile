# MSMEBazaar V2.0 Development Container
# Multi-stage build for Python and Node.js development environment

# Use the official Python image as base
FROM python:3.11-slim as python-base

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.7.1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    curl \
    git \
    wget \
    unzip \
    # Database clients
    postgresql-client \
    redis-tools \
    # Network tools
    net-tools \
    iputils-ping \
    telnet \
    # Development tools
    vim \
    nano \
    htop \
    tree \
    jq \
    # SSL certificates
    ca-certificates \
    # Process management
    supervisor \
    # Python development
    python3-dev \
    python3-pip \
    # Node.js dependencies
    nodejs \
    npm \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install global npm packages
RUN npm install -g \
    yarn \
    pnpm \
    @nestjs/cli \
    typescript \
    ts-node \
    nodemon \
    pm2

# Install Poetry for Python dependency management
RUN pip install poetry==$POETRY_VERSION

# Configure Poetry
ENV POETRY_HOME="/opt/poetry" \
    POETRY_CACHE_DIR="/opt/poetry/cache" \
    POETRY_CONFIG_DIR="/opt/poetry/config"

# Set working directory
WORKDIR /workspace

# Create necessary directories
RUN mkdir -p /workspace/logs \
    /workspace/data \
    /workspace/uploads \
    /workspace/backups

# Copy Python requirements first for better caching
COPY requirements.txt pyproject.toml poetry.lock* ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# If using Poetry, install dependencies
# RUN poetry config virtualenvs.create false \
#     && poetry install --no-dev --no-interaction --no-ansi

# Install additional Python packages for development
RUN pip install --no-cache-dir \
    # Development tools
    black \
    flake8 \
    mypy \
    isort \
    pytest \
    pytest-asyncio \
    pytest-cov \
    # FastAPI development
    uvicorn[standard] \
    gunicorn \
    # Database tools
    alembic \
    # Testing tools
    httpx \
    factory-boy \
    freezegun \
    # Monitoring and debugging
    prometheus-client \
    structlog \
    # Documentation
    mkdocs \
    mkdocs-material

# Copy package.json for Node.js dependencies
COPY apps/web/package*.json ./apps/web/

# Install Node.js dependencies
RUN cd apps/web && npm install

# Install additional development tools
RUN apt-get update && apt-get install -y \
    # Docker CLI (for Docker-in-Docker)
    docker.io \
    # Kubernetes tools
    kubectl \
    # Cloud tools
    awscli \
    # Monitoring tools
    prometheus-node-exporter \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install gh -y

# Install Docker Compose
RUN curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Create a non-root user for development
RUN groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid vscode --shell /bin/bash --create-home vscode \
    && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up user directories
RUN mkdir -p /home/vscode/.vscode-server/extensions \
    /home/vscode/.vscode-server-insiders/extensions \
    && chown -R vscode:vscode /home/vscode

# Copy development configuration files
COPY .devcontainer/config/ /home/vscode/.config/
COPY .devcontainer/.bashrc /home/vscode/.bashrc
COPY .devcontainer/.zshrc /home/vscode/.zshrc

# Set up Git configuration
RUN git config --system --add safe.directory /workspace

# Install Oh My Zsh for better terminal experience
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && chown -R vscode:vscode /home/vscode/.oh-my-zsh

# Install Zsh plugins
RUN git clone https://github.com/zsh-users/zsh-autosuggestions /home/vscode/.oh-my-zsh/custom/plugins/zsh-autosuggestions \
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting /home/vscode/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \
    && chown -R vscode:vscode /home/vscode/.oh-my-zsh/custom

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R vscode:vscode /workspace

# Create startup script
RUN cat > /usr/local/bin/start-dev.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting MSMEBazaar V2.0 Development Environment..."

# Start Redis if not running
if ! pgrep redis-server > /dev/null; then
    echo "Starting Redis..."
    redis-server --daemonize yes --port 6379
fi

# Start PostgreSQL if not running
if ! pgrep postgres > /dev/null; then
    echo "Starting PostgreSQL..."
    service postgresql start
fi

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
cd /workspace
# Add migration commands here when ready

# Start the development servers
echo "Starting development servers..."

# Start FastAPI services in background
cd /workspace/apps/auth-api && uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
cd /workspace/apps/msme-api && uvicorn main:app --host 0.0.0.0 --port 8002 --reload &
cd /workspace/apps/valuation-api && uvicorn main:app --host 0.0.0.0 --port 8003 --reload &
cd /workspace/apps/match-api && uvicorn main:app --host 0.0.0.0 --port 8004 --reload &
cd /workspace/apps/admin-api && uvicorn main:app --host 0.0.0.0 --port 8005 --reload &

# Start WhatsApp bot
cd /workspace/apps/whatsapp-bot && python main.py &

# Start Next.js frontend
cd /workspace/apps/web && npm run dev &

echo "✅ All services started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔐 Auth API: http://localhost:8001/docs"
echo "🏢 MSME API: http://localhost:8002/docs"
echo "💰 Valuation API: http://localhost:8003/docs"
echo "🎯 Match API: http://localhost:8004/docs"
echo "👨‍💼 Admin API: http://localhost:8005/docs"
echo "📱 WhatsApp Bot: http://localhost:5000"

# Keep the container running
tail -f /dev/null
EOF

RUN chmod +x /usr/local/bin/start-dev.sh

# Create health check script
RUN cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 MSMEBazaar V2.0 Health Check..."

# Check if services are running
services=(
    "redis-server:6379"
    "postgres:5432"
    "auth-api:8001"
    "msme-api:8002"
    "valuation-api:8003"
    "match-api:8004"
    "admin-api:8005"
    "frontend:3000"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if nc -z localhost $port; then
        echo "✅ $name is running on port $port"
    else
        echo "❌ $name is not responding on port $port"
    fi
done

echo "🏁 Health check completed!"
EOF

RUN chmod +x /usr/local/bin/health-check.sh

# Set up environment variables
ENV PATH="/home/vscode/.local/bin:${PATH}"
ENV PYTHONPATH="/workspace:${PYTHONPATH}"
ENV NODE_ENV="development"
ENV ENVIRONMENT="development"
ENV DEBUG="true"

# Expose ports
EXPOSE 3000 8001 8002 8003 8004 8005 5000 5432 6379 9090 3001

# Set the default user
USER vscode

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/usr/local/bin/start-dev.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh || exit 1

# Labels for better container management
LABEL maintainer="MSMEBazaar Development Team"
LABEL version="2.0.0"
LABEL description="MSMEBazaar V2.0 Development Environment"
LABEL org.opencontainers.image.title="MSMEBazaar V2.0 Dev Container"
LABEL org.opencontainers.image.description="Complete development environment for MSMEBazaar V2.0"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.vendor="MSMEBazaar"