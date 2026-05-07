# syntax=docker/dockerfile:1.6
# NekoCafe 预约服务 - 多阶段Dockerfile
# 班级：计算机233  姓名：刘俞靖  学号：231002501

# ===== Stage 1: Build =====
FROM python:3.12-slim AS build
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies to a specific directory
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ===== Stage 2: Test =====
FROM build AS test
COPY . .
RUN pip install --no-cache-dir pytest pytest-cov && \
    python -m pytest tests/ --cov=src --cov-report=xml --cov-report=term

# ===== Stage 3: Runtime =====
FROM python:3.12-slim AS runtime
WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 app && \
    chown -R app:app /app

# Copy installed dependencies from build stage
COPY --from=build /install /usr/local

# Copy application code
COPY --chown=app:app src/ ./src/

# Switch to non-root user
USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')"

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]