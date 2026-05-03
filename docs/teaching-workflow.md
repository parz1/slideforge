# 授课任务工作流

第一版授课工作流围绕本地任务文件夹展开：

```txt
task-folder/
  brief.md
  outline.md
  deck.yaml
  assets/
  output/
```

用户维护 `brief.md` 和 `outline.md`，素材放进 `assets/`。AI 只读取 `brief.md` 和 `outline.md` 中显式 `@assets/...` 引用到的文本素材；图片素材只作为可放入模板 slot 的引用。

`deck.yaml` 是核心产物。OpenAI 生成 Deck Spec 后先进入桌面端内存状态，用户确认后再保存为 `deck.yaml`。构建时会输出 Slidev 项目到 `output/slidev`，并尝试导出 `output/slides.pdf`。

`.env.local` 或 `.env` 放在仓库根目录；如果两个文件都存在，`.env.local` 优先：

```txt
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

API key 不会写入任务文件夹。

桌面端提供一个本地 Vault 来管理项目：

- `Create Project`：输入项目名，选择父文件夹，自动创建标准任务目录。
- `Open Project`：打开已有任务目录，并自动加入 Vault。
- Vault 列表保存在应用数据目录，不写入项目目录。
