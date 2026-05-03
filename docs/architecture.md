# 架构

Slideforge 采用“文案输入 -> AI 规划 -> 结构化内容 -> 模板编译 -> 渲染输出”的架构。

```text
Source Copy / Brief
        |
        v
LLM Planner
        |
        v
Storyboard
        |
        v
Deck Spec (YAML)
        |
        v
Validator + Template Constraints
        |
        v
Renderer
   |          |
   v          v
Slidev      PPTX (future)
```

## 子系统

### Desktop App

Electron + React 桌面工作台。它应该承载文案输入、大纲编辑、当页结构化内容编辑、校验结果、构建日志、active slide 预览和整套 Slidev 预览入口。

桌面端不是自由拖拽 PPT 编辑器。它的主要编辑对象是 Storyboard 和 Deck Spec。

### Planner

Planner 调用 LLM，把 source copy 或 brief 变成 Storyboard，再把 Storyboard 变成 Deck Spec 草案。

Planner 不直接生成最终 Slidev Markdown。它输出可校验的结构化数据，并保留生成理由、风险提示和需要用户确认的假设。

### Compiler

负责读取 Deck Spec、校验 JSON Schema、调用 renderer 生成 Slidev 文件。第一版的 renderer 用模板拼装 `slides.md`。

### Templates

模板定义 slide 类型、字段约束、内容密度和动画 preset。模板是控制输出稳定性的核心。

### Providers

LLM provider 是 Planner 的模型适配层。OpenAI、Anthropic、Ollama 都应实现同一接口，供 Planner 生成 Storyboard、Deck Spec 和修复校验错误。

### Exporters

第一阶段使用 Slidev 原生导出。未来如果要可编辑 PPTX，应新增独立 PPTX renderer。
