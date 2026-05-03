# Project Outline

这份大纲基于两个目录的对比：

- 当前项目：`/Users/parz1/Projects/Demos/slidev/slideforge`
- 旧项目：`/Users/parz1/Documents/New project`

## 一句话定位

Slideforge 是把旧项目的手工 Slidev Deck Factory，升级成可校验、可复现、可批量生成的结构化 deck 编译系统。

旧项目已经证明了制作方法：先写 brief 和 storyboard，再用固定页面模式生成 Slidev。当前项目应该把这套方法产品化：让用户或 LLM 只产出 Deck Spec，系统负责校验、模板约束、渲染、预览和导出。

## 两个项目的分工

### 旧项目提供的资产

旧项目是一个直接可用的 Slidev 制作工作台：

- `templates/brief.md`: 定义听众、目标、结论、证据和限制。
- `templates/storyboard.md`: 用每页标题、目的、takeaway、证据和视觉类型搭出故事线。
- `templates/slide-spec.md`: 为复杂页面补充单页意图、证据、视觉模式和风险。
- `templates/deck.md`: 一套标准 Slidev deck 起始模板。
- `scripts/new-deck.mjs`: 创建新 deck 的脚手架。
- `components/PrincipleCard.vue`、`components/MetricBox.vue`: 可复用页面组件。
- `style.css`: 统一颜色、卡片、指标框、流程块、note、checklist 样式。
- `decks/trial-lecture-graph-postfix`: 一个真实内容样例，展示了从 brief 到 storyboard 再到完整 slides 的流程。

这些资产说明旧项目的价值不在工程结构，而在“制作流程”和“页面模式”。

### 当前项目承担的产品化部分

当前项目已经建立了产品工程骨架：

- `packages/compiler`: 读取 Deck Spec，校验 schema，渲染 Slidev 文件。
- `schemas/deck.schema.json`: 结构化 deck 的机器校验入口。
- `packages/templates`: 内置 slide 模板和内容约束的未来来源。
- `packages/providers`: LLM provider 抽象，后续负责从用户意图生成 Deck Spec。
- `apps/desktop`: Electron + React 桌面端，后续承载编辑、校验、构建和预览。
- `docs`: 产品理念、架构、Deck Spec、模板系统和路线图。

当前项目的核心方向是：不要让用户直接维护 Slidev Markdown，而是维护可审查的 Deck Spec。

## 目标用户流程

第一阶段应该支持这个闭环：

```text
用户填写或粘贴 brief
  -> 生成 / 编辑 storyboard
  -> 生成 Deck Spec
  -> schema + template constraints 校验
  -> 编译成 Slidev project
  -> 本地预览
  -> 导出 PDF / PPTX
```

旧项目中的 `brief.md`、`storyboard.md`、`slide-spec.md` 不应简单复制成散落的 Markdown 模板，而应该成为当前系统里的结构化输入层：

- Brief: deck 级需求。
- Storyboard: slide 级叙事计划。
- Slide Spec: 单页模板输入。
- Deck Spec: renderer 的最终中间表示。

## 建议核心数据模型

### Deck Brief

Deck Brief 负责回答“为什么做这套演示”：

- deck name
- audience
- duration
- presenter
- desired belief
- desired action
- resistance
- one-line takeaway
- supporting points
- evidence
- constraints

### Storyboard

Storyboard 负责回答“这套演示怎么讲”：

- slide number
- slide title
- purpose
- takeaway
- evidence
- visual pattern

旧项目的 storyboard 已经很接近 MVP，可以先转成 YAML 或 JSON 后纳入 validator。

### Deck Spec

Deck Spec 负责回答“renderer 需要什么结构化输入”。当前已有字段可以保留：

- `meta`
- `slides[].id`
- `slides[].type`
- `slides[].title`
- `slides[].content`
- `slides[].animation.preset`

但需要扩展两类内容：

- `speakerNotes`: 旧项目 slides 中已有大量讲者备注，应作为一等字段。
- `source`: 记录 brief/storyboard/LLM 生成来源，便于审查和追踪。

## Slide 类型大纲

当前已有类型：

- `cover`
- `section`
- `bullet_summary`
- `comparison`
- `process`
- `closing`

结合旧项目真实 deck，MVP 应补充或细化这些页面模式：

- `metric_grid`: 对应旧项目的三指标卡片。
- `principle_card`: 单观点强调页或结论卡片。
- `code_explain`: 代码 + 解释卡片。
- `trace_table`: 算法、流程或状态追踪表。
- `workflow`: 线性步骤流程。
- `checklist`: 练习、验收或行动项。
- `two_column`: 问题拆解、对比讲解。
- `note_callout`: 重要提醒或风险说明。

旧项目里的 `PrincipleCard.vue`、`MetricBox.vue` 和 `style.css` 可以作为第一套 Slidev renderer 的组件与样式参考。

## 模块大纲

### Desktop App

目标是做实际工作台，而不是展示页：

- 打开 / 新建项目。
- 编辑 Brief、Storyboard、Deck Spec。
- 显示校验错误。
- 运行 build。
- 打开 Slidev 预览。
- 展示构建日志和导出入口。

当前前端 MVP 已经覆盖左侧 slide outline、中间当前页结构化编辑、右侧简化预览和 spec inspect。下一步应把内置状态替换成真实 `examples/*.deck.yaml` 文件读写，并把 Validate / Build / Preview 按钮接到 compiler。

### Compiler

Compiler 是系统核心：

- 读取 YAML / JSON。
- 校验 Deck Spec。
- 应用模板约束。
- 渲染 Slidev 文件。
- 写出 `slides.md`、`style.css`、组件和资源引用。

### Templates

Templates 应成为约束的单一来源：

- slide type 定义。
- content schema。
- 标题长度和内容密度限制。
- 支持的 animation preset。
- renderer adapter。

### Providers

Providers 只负责生成结构化草案：

- 从 brief 生成 storyboard。
- 从 storyboard 生成 Deck Spec。
- 修复 validator 报错。
- 不直接生成自由 Slidev Markdown。

### Exporters

短期使用 Slidev 原生能力：

- dev preview
- PDF export
- PPTX export

长期再评估独立 PPTX renderer，用于可编辑 PPTX。

## 迁移优先级

1. 把旧项目的 brief/storyboard/slide-spec 概念转成当前项目文档和 schema 设计。
2. 把 `trial-lecture-graph-postfix` 改写成一个结构化 `examples/trial-lecture.deck.yaml`，作为真实复杂样例。
3. 把 `PrincipleCard`、`MetricBox`、`workflow`、`note`、`checklist` 抽象成模板定义和 Slidev renderer 输出。
4. 扩展 `schemas/deck.schema.json`，让不同 slide type 有明确 content 约束。
5. 给 compiler 增加测试，先覆盖真实样例能稳定生成 Slidev。
6. 桌面端接入本地文件编辑、validate、build、preview。

## 非目标

当前阶段不做这些事：

- 不把旧项目的 `dist/`、PDF、`node_modules/` 迁入当前项目。
- 不让 LLM 直接输出最终 Slidev Markdown。
- 不急着实现完整 PPTX renderer。
- 不先做复杂的品牌后台或多人协作。

## MVP 定义

一个可接受的 MVP 应做到：

- 用户能从 brief/storyboard 得到可编辑的 Deck Spec。
- `pnpm validate` 能报告结构和模板约束错误。
- `pnpm build:deck` 能生成包含样式和组件的 Slidev project。
- 至少一个真实复杂样例可以完整预览。
- 桌面端能完成打开、校验、构建、预览的本地闭环。
