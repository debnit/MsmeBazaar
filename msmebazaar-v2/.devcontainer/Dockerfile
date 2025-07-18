FROM mcr.microsoft.com/devcontainers/python:3.11

# Install Node.js (for frontend builds if needed)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install Docker and system dependencies
RUN apt-get update && apt-get install -y \
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
    jq \
    && apt-get clean

# Optional: Set workdir
WORKDIR /workspace

# Install common Python tools
RUN pip install --upgrade pip setuptools wheel

# Install development dependencies
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    asyncpg \
    redis \
    pydantic \
    pytest \
    pytest-asyncio \
    black \
    flake8 \
    isort \
    mypy \
    structlog \
    prometheus-client \
    httpx

# Install global npm packages for development
RUN npm install -g \
    typescript \
    @types/node \
    nodemon \
    prettier \
    eslint

# Create non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# Set up development environment
RUN mkdir -p /workspace/logs /workspace/data /workspace/uploads
RUN chown -R $USERNAME:$USERNAME /workspace

# Switch to non-root user
USER $USERNAME

# Set environment variables
ENV PYTHONPATH="/workspace:${PYTHONPATH}"
ENV PATH="/home/$USERNAME/.local/bin:${PATH}"