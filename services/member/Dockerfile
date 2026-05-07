# syntax=docker/dockerfile:1.6
# NekoCafe 会员服务 - 多阶段Dockerfile
# 班级：计算机233  姓名：刘俞靖  学号：231002501

# ===== Stage 1: Build =====
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ===== Stage 2: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app && \
    chown -R app:app /app

# Copy production dependencies from build stage
COPY --from=build --chown=app:app /app/node_modules ./node_modules

# Copy application code
COPY --chown=app:app src/ ./src/

# Switch to non-root user
USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["node", "src/index.js"]