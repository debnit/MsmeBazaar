FROM mcr.microsoft.com/devcontainers/python:3.11

# Install Node.js (LTS), pnpm, and useful tools
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && apt-get install -y \
    nodejs \
    git \
    curl \
    build-essential \
    libpq-dev \
    libffi-dev \
    postgresql-client \
    redis-tools \
    vim \
    nano \
    htop \
    tree \
    jq && \
    npm install -g pnpm && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Upgrade Python packaging tools
RUN pip install --upgrade pip setuptools wheel

# Optional: pre-install FastAPI ecosystem tools
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] asyncpg redis \
    pytest pytest-asyncio \
    black flake8 isort mypy \
    structlog prometheus-client httpx

# Optional: Pre-install Node.js tooling (used in Next.js)
RUN npm install -g typescript prettier eslint

# Set default user
ARG USERNAME=vscode
USER $USERNAME

# Add user's pip path
ENV PATH="/home/${USERNAME}/.local/bin:${PATH}"
