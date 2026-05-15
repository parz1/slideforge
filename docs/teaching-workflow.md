# Teaching Workflow

授课场景仍然是 Slideforge 的第一目标用户场景，但 M1 已经从旧的 `brief.md / outline.md / deck.yaml` 改成 Markdown slide project。

## Project Layout

```text
course-project/
  project.yaml
  slides/
    001-cover.md
    002-goals.md
    003-code.md
  assets/
  output/
```

`project.yaml` 放项目级配置：

```yaml
title: Graph DFS and Postfix Notation
language: zh-CN
template: teaching
theme: lecture-light
```

每页 slide 是一个可读写的 Markdown 文件：

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

## User Flow

1. 在 launcher 创建或打开授课 project。
2. 在 Project tab 设置 template/theme，导入图片、代码、文本素材。
3. 在 Slides tab 选择 active slide，选择 layout，编辑 Markdown。
4. 右侧查看 active slide preview、layout guide、spec/checks。
5. 在 Export tab 启动完整 Slidev preview 或导出 PDF。

## Asset References

素材放在 `assets/` 下。slide Markdown 可以用显式引用：

```md
@assets/dfs-trace.png

- 观察递归栈变化
- 标出 visited 更新位置
```

M1 只处理图片和文本/code 文件。PDF、Word、Excel 抽取留到后续。

## AI Boundary

M1 弱化 AI。AI 不再是完成 deck 的主链路。

M2/M3 之后，AI 应该围绕 layout contract 工作：

- 生成或改写每页 Markdown
- 根据 layout guide 填内容
- 不直接生成最终 Slidev Markdown
- 不绕过 project files 和 renderer

API key 只从 `.env.local`、`.env` 或 process env 读取，不写入 project 文件夹。
