# Start Here

这份文档记录当前工程的工作起点。它不是产品说明，而是给开发协作使用的项目地图。

## 当前状态

Slideforge 的 M1 本地项目闭环已经 feature complete。当前桌面端是 Electron + React，主工作流是：

```text
Create/Open Project
  -> edit project.yaml
  -> edit slides/*.md
  -> import assets/
  -> compile internal Deck Spec
  -> Slidev preview / PDF export
```

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

每页 slide 是一个 Markdown 文件，frontmatter 控制结构：

```md
---
id: goals
layout: bullet-list
title: 课程目标
---

- 了解课程基本内容与目标
- 掌握核心知识点
- 通过课堂练习巩固理解
```

`Deck Spec` 仍然存在，但它是内部中间模型，不再是普通用户主要编辑的文件。

## 目录边界

- `apps/desktop`: Electron + React 桌面应用。
- `apps/desktop/electron/domain`: Electron main 可复用的领域常量和校验。
- `apps/desktop/electron/services`: project、asset、vault、AI、Slidev 等主进程服务。
- `packages/compiler`: Deck Spec 类型、校验、CLI、Slidev renderer。
- `packages/templates`: M2 将升级为 layout/template registry。
- `packages/providers`: LLM provider 抽象，目前只有占位接口。
- `schemas`: Deck Spec JSON Schema。
- `examples`: 可用于验证编译链路的示例 deck。
- `docs`: 产品、架构和实现策略文档。

## 常用命令

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
pnpm clean
```

`pnpm dev` 会先构建 `examples/trial-lecture.deck.yaml`，再同时启动：

- Desktop app: Electron 原生窗口。React renderer 使用自动选择的 `127.0.0.1` 端口。
- Sidecar Slidev preview: 用于示例 deck，默认从 `http://localhost:3030/` 开始找可用端口。

桌面端内的 active slide preview / deck preview 会由 Electron service 另外启动对应 project 的 Slidev preview。

## M1 验收

自动验收：

```bash
pnpm smoke:m1
pnpm check
pnpm --filter @slideforge/desktop typecheck
pnpm --filter @slideforge/desktop build
```

手动验收：

1. Create Project 生成 `project.yaml / slides / assets / output`。
2. Open Project 能读取新格式并写入 recent vault。
3. 修改 slide Markdown 后 slide list、preview、spec 同步。
4. Add / Duplicate / Delete slide 能真实修改 `slides/*.md`。
5. Import Assets 后素材出现在 `assets/`，缺失引用会提示。
6. Open Slide Preview 显示当前 active slide。
7. Preview Deck 和 Export PDF 能从项目文件重新编译。

## 下一步

进入 M2：layout/template system。

优先级最高的是让 layout registry 成为单一事实源。现在 renderer、desktop guide、Electron parser、AI prompt 仍有重复定义，M2 要把这些约束集中起来，否则后续新增 layout 会持续产生 schema drift。
