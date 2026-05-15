# Project Outline

这份大纲记录当前项目边界和从旧 Slidev 制作流程继承下来的产品判断。

## 定位

Slideforge 是面向高频发表、授课、组会、汇报场景的本地演示稿生产工具。它服务的不是想自由拖拽做视觉设计的人，而是已经有内容、希望快速生成结构工整、风格稳定、可继续编辑的演示稿的人。

当前 M1 决策：

- 用户维护本地 project。
- 用户主要写 Markdown slide 文件。
- frontmatter 描述每页 `id/layout/title`。
- 系统内部编译成 Deck Spec。
- Slidev 是渲染后端，不是用户直接面对的语法层。

## Project Contract

```text
project/
  project.yaml
  slides/
    001-cover.md
    002-goals.md
    003-code.md
  assets/
  output/
```

`project.yaml`：

```yaml
title: Graph DFS and Postfix Notation
language: zh-CN
template: teaching
theme: lecture-light
```

`slides/002-goals.md`：

```md
---
id: goals
layout: bullet-list
title: 课程目标
---

- 了解 DFS 的递归过程
- 能手动追踪 visited 状态
- 理解后缀表达式的计算顺序
```

## 用户工作流

M1：

```text
Create/Open Project
  -> choose template/theme
  -> edit slides/*.md
  -> import assets
  -> active slide preview
  -> full deck preview
  -> export PDF
```

M2/M3：

```text
Source Copy / Existing Draft
  -> AI drafts slide markdown
  -> user edits page content
  -> layout/template registry validates
  -> preview/export
```

## 从旧项目继承的东西

旧项目 `/Users/parz1/Documents/New project` 证明了两个事实：

- 真实价值不在“会不会写 Slidev”，而在一套稳定页面模式。
- 复杂页面最终都能归约为 layout + components + content slots。

因此当前项目不应该优先做自由表单编辑器，而应该优先做好 layout system：

- layout 告诉用户这一页怎么写。
- template 决定可用 layout 集合和默认主题。
- renderer 保证同样输入得到稳定输出。
- AI 根据 layout contract 生成草稿。

## M1 完成标准

- Create/Open Project
- recent vault
- `project.yaml + slides/*.md + assets + output`
- Markdown editor
- layout guide/example
- add / duplicate / delete slide
- asset import and missing reference checks
- active slide preview
- full deck preview
- PDF export
- Electron main service/domain 分层

## M2 重点

M2 不是继续堆 UI，而是建立 layout/template 系统：

- 单一 layout registry
- 每个 layout 有 Markdown contract、schema、example、renderer
- Desktop guide 从 registry 读取
- Project Store parser 从 registry 派生
- AI prompt 从 registry 派生
- Compiler renderer 和 registry 对齐
- layout 级 smoke test

## 非目标

- 不做完整拖拽 PPT 编辑器。
- 不让用户直接写 Slidev/Vue。
- 不在 M1/M2 追求可编辑 PPTX。
- 不把 AI 设为生成 deck 的唯一入口。
- 不做多人协作和云端模板市场。
