# Runbook — NekoCafé 运维手册

## 服务异常告警时

### 1. 快速诊断
```bash
# 检查所有 Pod 状态
kubectl get pods -n production -o wide

# 查看 Deployment 状态
kubectl get deploy -n production -o wide
```

### 2. 在 Grafana 查看 P99/错误率
1. 打开 Grafana Dashboard "NekoCafé - 服务可观测性"
2. 检查 **错误率** 面板：是否超过 1% 阈值
3. 检查 **P99 延迟** 面板：是否超过 500ms
4. 检查 **QPS** 面板：是否有流量突增

### 3. 在 Loki 检索最近 5min 的 ERROR 日志
```logql
{service="reservation"} |= "ERROR" | json
```

### 4. 在 Tempo 检索涉事 traceId
找到日志中的 `trace_id`，在 Tempo 中打开完整链路

### 5. 紧急回滚
```bash
helm rollback nekocafe -n production --wait
```

## 告警触发条件

| 告警 | 条件 | 级别 |
|------|------|------|
| ServiceDown | 服务不可达超过 2 分钟 | critical |
| HighErrorRate | 5xx 错误率 > 1% | critical |
| HighLatency | P99 延迟 > 1 秒 | warning |
| PodRestartingFrequently | Pod 在 15 分钟内重启 | warning |
| HighCPUUsage | CPU 使用率 > 85% | warning |