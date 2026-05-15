# Roadmap

Slideforge 当前进入 M2。M1 的目标是把本地桌面闭环跑通；M2 开始处理这个产品真正会长期变复杂的地方：layout / template / theme 的治理。

## M1: Local Project MVP

Status: feature complete, hardening.

用户可以创建或打开本地 project，用 Markdown 写每页内容，选择 layout，预览并导出。

```text
project/
  project.yaml
  slides/
    001-cover.md
    002-goals.md
  assets/
  output/
```

已完成：

- Electron + React 桌面壳
- intro launcher：Create Project / Open Project / recent vault
- Markdown-first slide 文件：frontmatter 控制 `id/layout/title`
- `project.yaml` 控制项目级 `title/language/template/theme`
- slide add / duplicate / delete
- asset import、引用扫描、缺失引用提示
- 当前页 Slidev live preview
- 完整 deck preview 和 PDF export
- main process 拆分为 project、asset、vault、AI、Slidev services

M1 收尾标准：

- `pnpm smoke:m1`
- `pnpm --filter @slideforge/desktop typecheck`
- `pnpm --filter @slideforge/desktop build`
- 手动验收 create/open/save/preview/export

## M2: Layout And Template System

Status: next.

目标是把 Slideforge 从“能写 slide 的 app”推进成“可维护的 layout/template 库”。用户不该理解 Slidev 语法，但必须知道每种 layout 怎么写内容、能放什么素材、会生成什么视觉结构。

重点：

- 建立 layout registry 的单一事实源
- 每个 layout 定义：
  - id、name、category、description
  - markdown contract
  - props schema / default props
  - example body
  - allowed asset roles
  - renderer implementation
- renderer、desktop guide、AI prompt、project parser 都从同一套 registry 派生
- teaching / clean 两套 template 只是 layout 集合和主题默认值，不再各自复制约束
- 增加 layout 级 smoke examples，防止某个 layout 能解析但不能渲染

M2 第一批工程任务：

1. 把 `packages/templates` 升级为 layout/template registry。
2. 让 compiler 的 `builtinLayouts` 和 desktop 的 layout guide 共用 registry 元数据。
3. 让 Electron project parser 使用 registry 中的 markdown contract。
4. 增加 `pnpm smoke:layouts`，逐个 layout 生成一页 deck 并编译到 Slidev。

## M3: AI Drafting

AI 先作为草稿助手，不作为主链路。

目标：

- 从现有 slides、project config、assets 生成补全草稿
- 生成或修复每页 Markdown，而不是直接生成最终 Slidev
- 使用 layout registry 约束 prompt
- 显示生成理由和可审查 diff
- 支持单页 rewrite / expand / shorten

## M4: Output Hardening

目标：

- PDF export 稳定化
- Slidev preview 进程管理更可靠
- 构建日志结构化
- 输出目录清理和缓存策略
- 调研可编辑 PPTX renderer，但不阻塞 M1/M2

## M5: Template Authoring

目标：

- 内置更多 layout
- theme token 管理
- AI 生成 layout / Vue component 草稿
- layout lint 和截图验收
- template library / vault
