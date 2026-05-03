# Contributing

Slideforge 目前处于产品工程骨架阶段。贡献时请优先保持“模板受控、结构化、可审查”的方向。

## 本地开发

```bash
pnpm install
pnpm validate
pnpm build:deck
pnpm dev:desktop
```

## 设计原则

- 不让模型直接决定最终排版。
- 先生成 Deck Spec，再由模板 renderer 输出。
- 所有模板都应有明确输入字段和内容约束。
- 新增能力时优先更新 `docs/` 和 `schemas/deck.schema.json`。

## 提交前检查

```bash
pnpm validate
pnpm build:deck
pnpm typecheck
```
