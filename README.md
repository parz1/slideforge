# Slideforge

Slideforge 是一个 **template-controlled deck compiler**：把结构化内容转换为品牌一致、可审查、可复现、可批量生成的 Slidev / PPT 演示文稿。

它不是让普通用户直接写 Slidev Markdown，也不是让 AI 自由生成不可控的 PPT。Slideforge 的核心思路是：

```text
用户意图 / 文案素材
  -> Deck Spec (YAML)
  -> 校验与模板约束
  -> Slidev Renderer
  -> HTML / PDF / PPTX
```

## 为什么不是普通 AI PPT

普通 AI PPT 工具常见问题是输出不稳定、模板不可控、审查困难、批量生产困难。Slideforge 把幻灯片生产拆成可审查的编译链路：

- `structured content to branded Slidev/PPT pipeline`
- 模板控制布局、密度、动画和品牌样式
- Deck Spec 可提交、可 diff、可审查
- 同一个 spec + 同一个 theme 应该得到稳定输出

## 快速开始

```bash
pnpm install
pnpm dev
pnpm validate
pnpm build:deck
pnpm dev:slidev
pnpm dev:desktop
```

当前版本是产品工程骨架：

- `pnpm dev` 同时启动 Electron 桌面 app 和 trial deck 的 Slidev 预览
- `pnpm validate` 校验 `examples/basic.deck.yaml`
- `pnpm build:deck` 生成 `.slideforge/build/slides.md`
- `pnpm dev:slidev` 使用 Slidev 预览生成结果
- `pnpm dev:desktop` 启动 Electron + React 桌面壳

## 目录结构

```text
apps/desktop          Electron + React 桌面端工作台
packages/compiler     Deck Spec 类型、校验、Slidev renderer 占位实现
packages/templates    固定 slide 模板注册表
packages/providers    多 LLM provider 抽象接口
schemas/              Deck Spec JSON Schema
examples/             示例 deck spec
docs/                 产品理念、架构、模板系统、路线图
```

## 当前边界

第一版优先验证 Slidev 预览链路，不保证 PPTX 可编辑性。Slidev 导出的 PPTX 通常更适合作为视觉交付物；如果未来要可编辑 PPTX，应增加独立 PPTX renderer。

## 文档

- [Start Here](docs/start-here.md)
- [项目大纲](docs/project-outline.md)
- [产品理念](docs/product-principles.md)
- [架构](docs/architecture.md)
- [Deck Spec](docs/deck-spec.md)
- [模板系统](docs/template-system.md)
- [Provider 策略](docs/provider-strategy.md)
- [路线图](docs/roadmap.md)
