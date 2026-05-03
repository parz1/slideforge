# Start Here

这份文档记录当前工程的工作起点。它不是产品说明，而是给开发协作使用的项目地图。

## 当前状态

Slideforge 目前是一个 pnpm workspace 骨架，核心链路已经可跑通：

```text
examples/basic.deck.yaml
  -> schemas/deck.schema.json 校验
  -> packages/compiler 渲染
  -> .slideforge/build/slides.md + style.css
  -> Slidev 预览
```

桌面端位于 `apps/desktop`，现在是 Electron + React 的壳，主要用于承载后续的 Deck Spec 编辑、校验、构建和预览工作流。

当前桌面端已经有一个授课工作流 MVP：支持打开本地任务文件夹、读取 `brief.md` / `outline.md` / `assets/` / `deck.yaml`、调用 OpenAI 生成 Deck Spec、结构化编辑当前页、保存 `deck.yaml`、构建 Slidev 输出并尝试导出 PDF。

授课任务 MVP 的本地文件夹工作流见 `docs/teaching-workflow.md`。可用 `examples/tasks/trial-lecture-task` 作为打开任务文件夹的试用样例。

## 目录边界

- `packages/compiler`: Deck Spec 类型、校验、CLI、Slidev renderer。
- `packages/templates`: 内置模板定义和模板约束，后续应成为 renderer 的主要约束来源。
- `packages/providers`: LLM provider 抽象，目前只有占位接口。
- `apps/desktop`: Electron + React 桌面应用。
- `schemas`: Deck Spec JSON Schema。
- `examples`: 可用于验证编译链路的示例 deck。
- `docs`: 产品、架构和实现策略文档。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm validate
pnpm build:deck
pnpm dev:slidev
pnpm dev:desktop
pnpm typecheck
pnpm clean
```

`pnpm dev` 会先构建 `examples/trial-lecture.deck.yaml`，再同时启动：

- Desktop app: Electron 原生窗口。React renderer 固定使用 `http://127.0.0.1:1420/`。
- Slidev preview: 默认从 `http://localhost:3030/` 开始找可用端口。

如果 Slidev 端口被占用，脚本会自动选择下一个可用端口并在终端打印实际地址。也可以用环境变量指定起始端口：

```bash
SLIDEFORGE_SLIDEV_PORT=3040 pnpm dev
```

## 整理规则

生成物不作为源码维护：

- `dist/`
- `apps/*/dist/`
- `apps/desktop/dist/`
- `.slideforge/build/*`，但保留 `.slideforge/build/.gitkeep`

如果需要重新生成示例输出，运行：

```bash
pnpm build:deck
```

## 建议下一步

1. 让 `packages/templates` 成为模板约束的单一来源，避免 schema、类型和 renderer 各自维护 slide type 规则。
2. 把 `examples/trial-lecture.deck.yaml` 作为真实复杂样例继续压测 schema 和 renderer。
3. 给 compiler 增加最小测试集，覆盖校验失败、HTML 转义、step reveal 和输出文件写入。
4. 让桌面端接入本地示例文件的 validate/build/preview，而不是急着接 LLM provider。

如果需要更完整的项目边界和迁移顺序，见 `docs/project-outline.md`。
