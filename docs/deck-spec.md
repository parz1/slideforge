# Deck Spec

Deck Spec 是 Slideforge 的中间产物。它应该适合人类审查，也适合机器校验和渲染。

第一版使用 YAML，并通过 `schemas/deck.schema.json` 校验。

## Deck 是什么

在这个项目里，`deck` 指一整套演示稿，而不是单页幻灯片。它包含：

- 演示稿的元信息，例如标题、语言、主题。
- 一组有顺序的 slides。
- 每页 slide 的结构化内容、页面类型、动画 preset 和讲者备注。

也就是说：

```text
deck = presentation
slide = presentation 里的单页
Deck Spec = 用 YAML 描述这个 presentation 的结构化数据
```

Slideforge 不把 deck 设计成最终的 Slidev Markdown。Deck Spec 是更上游的中间表示，renderer 再把它翻译成 Slidev。

## 设计原则

Deck Spec 的核心设计是把“内容意图”和“渲染实现”分开：

- 用户和 LLM 写结构化内容，不直接写 Slidev 语法。
- slide type 决定页面模式，例如指标卡、代码解释、流程、追踪表。
- content 只填这个页面模式需要的数据。
- animation preset 表示讲述节奏，不暴露 `v-click` 等底层实现。
- renderer 负责把结构化数据转成 `slides.md`、`style.css` 和未来的组件文件。

这样做的好处是 deck 可以被校验、diff、审查和批量生成；同一份 spec 也可以在未来输出到 Slidev、PDF、PPTX 或其他 renderer。

## 最小结构

```yaml
meta:
  title: "Slideforge 产品雏形"
  language: "zh-CN"
  theme: "corporate"
slides:
  - id: "cover"
    type: "cover"
    title: "Slideforge"
    content:
      subtitle: "模板受控的幻灯片编译系统"
    animation:
      preset: "none"
```

## 字段

- `meta.title`：整套 deck 的标题。
- `meta.language`：输出语言，例如 `zh-CN`、`ja-JP`、`en-US`。
- `meta.theme`：品牌主题名。
- `slides[].id`：稳定 ID，用于审查、引用和增量更新。
- `slides[].type`：模板类型。
- `slides[].title`：页面标题。
- `slides[].content`：模板输入内容。
- `slides[].speakerNotes`：讲者备注，渲染为 Slidev 注释。
- `slides[].animation.preset`：讲述节奏，而不是底层动画代码。

## Slide 类型

- `cover`
- `section`
- `bullet_summary`
- `comparison`
- `metric_grid`
- `principle_card`
- `code_explain`
- `trace_table`
- `process`
- `workflow`
- `checklist`
- `two_column`
- `note_callout`
- `closing`

这些类型不是视觉皮肤，而是内容结构。比如 `trace_table` 明确要求 `columns` 和 `rows`，`metric_grid` 明确要求一组 `label/value/note`，这样 validator 才能在渲染前发现内容缺失或格式错误。

## 原则

Deck Spec 不应该暴露 Slidev 细节。用户和 LLM 不需要写 `layout`、`::right::`、`v-click` 或 Vue 组件。
