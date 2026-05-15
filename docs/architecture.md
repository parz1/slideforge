# Architecture

Slideforge 采用“本地项目文件 -> 内部 Deck Spec -> layout/template 编译 -> Slidev 输出”的架构。AI 是辅助层，不是 M1 主链路。

```text
project.yaml + slides/*.md + assets/
        |
        v
Project Store
        |
        v
Internal Deck Spec
        |
        v
Validator + Layout/Template Registry
        |
        v
Compiler / Renderer
   |          |
   v          v
Slidev      PDF
```

## Desktop App

Electron + React 桌面工作台。它承载：

- project launcher
- project config
- slide markdown editor
- layout selector and guide
- asset import and reference checks
- active slide preview
- full deck preview
- PDF export

桌面端不是自由拖拽 PPT 编辑器。M1 的主要编辑对象是 `project.yaml` 和 `slides/*.md`。`Deck Spec` 是内部中间模型，用于校验、预览和导出。

## Electron Main

主进程只负责窗口、dialog、IPC 和服务编排。业务逻辑拆到 service/domain：

- `domain/deck-constants.mjs`
- `domain/deck-validation.mjs`
- `services/project-store.mjs`
- `services/project-files.mjs`
- `services/asset-store.mjs`
- `services/vault-store.mjs`
- `services/slidev-service.mjs`
- `services/ai-draft-service.mjs`

## Project Store

Project Store 读取本地 project：

```text
project/
  project.yaml
  slides/*.md
  assets/
  output/
```

它负责解析 slide frontmatter 和 Markdown body，扫描 assets，解析显式 `@assets/...` 引用，并组装内部 Deck Spec。

## Compiler

Compiler 负责：

- 校验 Deck Spec
- 根据 layout 渲染 Slidev `slides.md`
- 写出 layout Vue files、style.css 和资源引用
- 为 Slidev preview/export 提供输出目录

## Layout / Template Registry

M2 的核心是把 layout/template registry 变成单一事实源。

Registry 应定义：

- layout id/name/category
- Markdown contract
- props schema/default props
- example body
- allowed asset roles
- renderer implementation

Desktop guide、Project Store parser、Compiler renderer、AI prompt 都应从 registry 派生，避免 schema drift。

## AI Draft Service

AI Draft Service 读取 `.env.local`、`.env` 或 process env 中的 OpenAI 配置。M1 中 AI 不是主链路；M2/M3 后它应该根据 layout contract 生成或修改 slide Markdown，而不是绕过 project files 直接生成最终 Slidev。

## Export

M1 使用 Slidev 原生预览和 PDF export。未来如果要可编辑 PPTX，应新增独立 renderer，不把它阻塞在 M1/M2。
