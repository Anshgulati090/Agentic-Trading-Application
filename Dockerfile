# Multi-stage Dockerfile for Agentic Trading Application
# Optimized for production deployment with minimal image size

# =============================================================================
# STAGE 1: Frontend Build
# =============================================================================
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies required for build
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# =============================================================================
# STAGE 2: Backend Python Environment
# =============================================================================
FROM python:3.11-slim AS backend-base

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt requirement_backend.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirement_backend.txt

# =============================================================================
# STAGE 3: Production Image
# =============================================================================
FROM backend-base AS production

# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Copy backend code
COPY backend/ ./backend/
COPY FinAgents/ ./FinAgents/
COPY core/ ./core/
COPY main.py ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p logs data/cache models configs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 8000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# =============================================================================
# STAGE 4: Development Image
# =============================================================================
FROM backend-base AS development

# Install development dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    black \
    flake8 \
    mypy \
    pre-commit

# Copy all source code
COPY . ./

# Create directories
RUN mkdir -p logs data/cache models configs tests

# Expose ports
EXPOSE 8000 9090

# Default command for development (with hot reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
