# Rollback Guide

## 自动回滚

CD 流水线在以下情况自动触发回滚：
- **错误率 > 1%**: 金丝雀监控检测到 5xx 错误率超过阈值
- **P95 延迟 > 500ms**: 金丝雀 P95 响应时间超过阈值

## 一键回滚命令

```bash
# 回滚到上一个稳定版本
helm rollback nekocafe -n production --wait

# 回滚到指定 revision
REVISION=$(helm history nekocafe -n production --max=10 | grep "deployed" | tail -1 | awk '{print $1}')
helm rollback nekocafe $REVISION -n production --wait
```

## 手动紧急回滚

```bash
# 1. 查看部署历史
helm history nekocafe -n production

# 2. 回滚到指定版本 (例如 revision 3)
helm rollback nekocafe 3 -n production --wait

# 3. 验证回滚结果
kubectl get pods -n production -l app=nekocafe
kubectl logs -n production deployment/nekocafe --tail=20

# 4. 验证端点
curl -s https://api.nekocafe.com/healthz | grep ok
```