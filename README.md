# Slideforge

Slideforge 是一个 **template-controlled deck compiler**：把结构化内容转换为品牌一致、可审查、可复现、可批量生成的 Slidev / PPT 演示文稿。

它不是让普通用户直接写 Slidev 语法，也不是让 AI 自由生成不可控的 PPT。Slideforge 的核心思路是：

```text
project.yaml + slides/*.md + assets/
  -> internal Deck Spec
  -> layout/template 校验
  -> Slidev Renderer
  -> HTML / PDF / PPTX
```

## 为什么不是普通 AI PPT

普通 AI PPT 工具常见问题是输出不稳定、模板不可控、审查困难、批量生产困难。Slideforge 把幻灯片生产拆成可审查的编译链路：

- `structured content to branded Slidev/PPT pipeline`
- layout/template 控制布局、密度、动画和品牌样式
- project 文件可提交、可 diff、可审查
- 同一组 project files + 同一个 theme 应该得到稳定输出

## 快速开始

```bash
pnpm install
pnpm dev
pnpm smoke:m1
pnpm check
pnpm verify
pnpm --filter @slideforge/desktop typecheck
pnpm --filter @slideforge/desktop build
pnpm validate
pnpm build:deck
```

当前版本是 M1 本地项目 MVP：

- `pnpm dev` 启动 Electron 桌面 app，并同时启动一个 trial deck 的 sidecar Slidev 预览
- 桌面端支持 create/open project、编辑 `project.yaml` 和 `slides/*.md`、导入 assets、预览和导出
- `pnpm smoke:m1` 覆盖 project-store 的创建、增删复制 slide、组装 Deck Spec
- `pnpm check` 运行 oxfmt、oxlint、typecheck 和 M1 smoke
- `pnpm verify` 在 `pnpm check` 之后追加 desktop production build
- `pnpm validate` 校验 `examples/basic.deck.yaml`
- `pnpm build:deck` 生成 `.slideforge/build/slides.md`

M1 project 结构：

```text
project/
  project.yaml
  slides/
    001-cover.md
    002-goals.md
  assets/
  output/
```

## 目录结构

```text
apps/desktop          Electron + React 桌面端工作台
packages/compiler     Deck Spec 类型、校验、Slidev renderer 占位实现
packages/templates    M2 layout/template registry
packages/providers    多 LLM provider 抽象接口
schemas/              Deck Spec JSON Schema
examples/             示例 deck spec
docs/                 产品理念、架构、模板系统、路线图
```

## 当前边界

第一版优先验证本地 project、Markdown slide、Slidev 预览和 PDF 导出链路，不保证 PPTX 可编辑性。Slidev 导出的 PPTX 通常更适合作为视觉交付物；如果未来要可编辑 PPTX，应增加独立 PPTX renderer。

下一阶段是 M2：把 layout/template registry 变成单一事实源，让 renderer、desktop guide、Electron parser 和 AI prompt 共用同一套约束。

## 文档

- [Start Here](docs/start-here.md)
- [项目大纲](docs/project-outline.md)
- [产品理念](docs/product-principles.md)
- [架构](docs/architecture.md)
- [Deck Spec](docs/deck-spec.md)
- [模板系统](docs/template-system.md)
- [Provider 策略](docs/provider-strategy.md)
- [路线图](docs/roadmap.md)
