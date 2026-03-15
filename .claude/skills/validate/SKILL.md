---
allowed-tools: Bash
disable-model-invocation: true
---

# /validate — Run all checks

Run type-check, build, and tests in fail-fast order. Stop on first failure.

## Steps

```bash
echo "=== Step 1/3: Type Check ===" && pnpm -r exec tsc --noEmit
```

```bash
echo "=== Step 2/3: Build ===" && pnpm build
```

```bash
echo "=== Step 3/3: Tests ===" && pnpm test
```

```bash
echo "✓ All checks passed"
```
