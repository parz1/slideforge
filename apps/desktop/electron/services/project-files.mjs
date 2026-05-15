import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { DEFAULT_TEMPLATE, DEFAULT_THEME, TEMPLATE_IDS } from "../domain/deck-constants.mjs";

export function sanitizeProjectFolderName(name) {
  const sanitized = String(name ?? "")
    .split("")
    .map((character) => {
      if (/[a-z0-9_-]/i.test(character)) {
        return character;
      }
      if (/\s/.test(character)) {
        return "-";
      }
      return "";
    })
    .join("")
    .replace(/^-+|-+$/g, "");
  return sanitized || "slideforge-project";
}

export async function readProjectConfig(taskDir) {
  const projectPath = path.join(taskDir, "project.yaml");
  if (!fsSync.existsSync(projectPath)) {
    if (fsSync.existsSync(path.join(taskDir, "deck.yaml"))) {
      throw new Error(
        "This is an old deck.yaml project. SlideForge M1 requires project.yaml and slides/*.md.",
      );
    }
    throw new Error("project.yaml is required.");
  }
  const raw = await fs.readFile(projectPath, "utf8");
  return normalizeProjectConfig(yaml.load(raw));
}

export function normalizeProjectConfig(value) {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const template = TEMPLATE_IDS.has(candidate.template) ? candidate.template : DEFAULT_TEMPLATE;
  const fallbackTheme = template === "clean" ? "clean-light" : DEFAULT_THEME;
  return {
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title.trim()
        : "Untitled deck",
    language:
      typeof candidate.language === "string" && candidate.language.trim()
        ? candidate.language.trim()
        : "zh-CN",
    template,
    theme:
      typeof candidate.theme === "string" && candidate.theme.trim()
        ? candidate.theme.trim()
        : fallbackTheme,
  };
}

export async function writeProjectYaml(taskDir, projectConfig) {
  const output = yaml.dump(normalizeProjectConfig(projectConfig), {
    noRefs: true,
    lineWidth: 100,
  });
  await fs.writeFile(path.join(taskDir, "project.yaml"), output);
}

export async function readSlideFiles(taskDir) {
  const slidesDir = path.join(taskDir, "slides");
  if (!fsSync.existsSync(slidesDir)) {
    throw new Error("slides/ folder is required.");
  }
  const entries = await fs.readdir(slidesDir, { withFileTypes: true });
  const markdownEntries = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (markdownEntries.length === 0) {
    throw new Error("At least one slides/*.md file is required.");
  }

  const slideFiles = [];
  const usedIds = new Set();
  for (const entry of markdownEntries) {
    const markdown = await fs.readFile(path.join(slidesDir, entry.name), "utf8");
    const parsed = parseSlideMarkdown(markdown);
    if (usedIds.has(parsed.frontmatter.id)) {
      throw new Error(`Duplicate slide id "${parsed.frontmatter.id}" in ${entry.name}.`);
    }
    usedIds.add(parsed.frontmatter.id);
    slideFiles.push({
      fileName: entry.name,
      path: `slides/${entry.name}`,
      markdown,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      slide: slideFromMarkdown(parsed.frontmatter, parsed.body),
    });
  }
  return slideFiles;
}

export function parseSlideMarkdown(markdown) {
  const match = String(markdown ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error("slide markdown must start with frontmatter.");
  }
  const parsed = yaml.load(match[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("slide frontmatter must be an object.");
  }
  if (typeof parsed.id !== "string" || !parsed.id.trim()) {
    throw new Error("frontmatter.id must be a non-empty string.");
  }
  if (typeof parsed.layout !== "string" || !parsed.layout.trim()) {
    throw new Error("frontmatter.layout must be a non-empty string.");
  }
  if (typeof parsed.title !== "string") {
    throw new Error("frontmatter.title must be a string.");
  }
  if (parsed.props && (typeof parsed.props !== "object" || Array.isArray(parsed.props))) {
    throw new Error("frontmatter.props must be an object.");
  }
  return {
    frontmatter: {
      id: parsed.id.trim(),
      layout: parsed.layout.trim(),
      title: parsed.title,
      props: parsed.props,
      speakerNotes: typeof parsed.speakerNotes === "string" ? parsed.speakerNotes : undefined,
    },
    body: String(markdown ?? "")
      .slice(match[0].length)
      .trim(),
  };
}

export function slideMarkdown(frontmatter, body) {
  return [
    "---",
    yaml.dump(frontmatter, { noRefs: true, lineWidth: 100 }).trim(),
    "---",
    "",
    String(body ?? "").trim(),
    "",
  ].join("\n");
}

export function deckFromProjectFiles(projectConfig, slideFiles, assets) {
  return {
    meta: {
      title: projectConfig.title,
      language: projectConfig.language,
      template: projectConfig.template,
      theme: projectConfig.theme,
    },
    assets,
    slides: slideFiles.map((slideFile) => slideFile.slide),
  };
}

export async function safeSlideFilePath(taskDir, fileName) {
  const name = path.basename(String(fileName ?? ""));
  if (!name || name !== fileName || !name.toLowerCase().endsWith(".md")) {
    throw new Error("Invalid slide file name.");
  }
  const slidesDir = path.join(taskDir, "slides");
  const candidate = path.resolve(slidesDir, name);
  const relation = path.relative(slidesDir, candidate);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error("Slide file path escapes slides/.");
  }
  return candidate;
}

export async function uniqueSlideFileName(taskDir, index, layout) {
  const slidesDir = path.join(taskDir, "slides");
  await fs.mkdir(slidesDir, { recursive: true });
  const prefix = String(index).padStart(3, "0");
  const base = sanitizeProjectFolderName(String(layout ?? "slide").replace(/_/g, "-"));
  let candidate = `${prefix}-${base}.md`;
  let suffix = 2;
  while (fsSync.existsSync(path.join(slidesDir, candidate))) {
    candidate = `${prefix}-${base}-${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

export function uniqueSlideId(base, existingIds) {
  const used = new Set(existingIds);
  const root = sanitizeId(
    String(base ?? "slide")
      .toLowerCase()
      .replace(/-+/g, "-"),
  );
  let candidate = root || "slide";
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  return candidate;
}

export function layoutTitle(layout) {
  const labels = {
    "title-cover": "Title Cover",
    "section-divider": "Section Divider",
    "bullet-list": "Bullet List",
    "two-column": "Two Column",
    "image-left-text-right": "Image + Text",
    "progress-dashboard": "Progress Dashboard",
    "system-flow": "System Flow",
    "quote-callout": "Quote Callout",
    "code-walkthrough": "Code Walkthrough",
    "exercise-checklist": "Exercise Checklist",
    "lab-progress": "Lab Progress",
    "research-system-concept": "Research System Concept",
  };
  return labels[layout] ?? "Untitled slide";
}

export function defaultMarkdownBodyForLayout(layout, projectTitle) {
  return layoutExampleBody(layout).replace(/\{\{projectTitle\}\}/g, projectTitle);
}

export function defaultProjectConfig(name) {
  return {
    title: name,
    language: "zh-CN",
    theme: DEFAULT_THEME,
    template: DEFAULT_TEMPLATE,
  };
}

export function defaultSlideMarkdown(name) {
  return slideMarkdown(
    {
      id: "cover",
      layout: "title-cover",
      title: name,
    },
    "从这里开始写这一页要讲的内容。",
  );
}

function slideFromMarkdown(frontmatter, body) {
  return {
    id: frontmatter.id,
    layout: frontmatter.layout,
    title: frontmatter.title,
    props: {
      ...markdownBodyToProps(frontmatter.layout, body),
      ...frontmatter.props,
    },
    speakerNotes: frontmatter.speakerNotes,
  };
}

function markdownBodyToProps(layout, body) {
  if (layout === "bullet-list") {
    return { points: markdownListItems(body) };
  }
  if (layout === "exercise-checklist") {
    return { items: markdownListItems(body) };
  }
  if (layout === "two-column") {
    const sections = markdownSections(body).slice(0, 2);
    return {
      columns:
        sections.length > 0
          ? sections.map((section) => ({
              title: section.title,
              items: markdownListItems(section.body),
            }))
          : [
              { title: "Left", items: ["Item one", "Item two"] },
              { title: "Right", items: ["Item one", "Item two"] },
            ],
    };
  }
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    const sections = markdownSectionMap(body);
    return {
      done: markdownListItems(sections.get("done") ?? "").map(progressMetricFromText),
      doing: markdownListItems(sections.get("doing") ?? "").map(progressMetricFromText),
      nextPlan: markdownListItems(sections.get("next") ?? sections.get("next plan") ?? ""),
      problem: markdownListItems(sections.get("problems") ?? sections.get("problem") ?? ""),
    };
  }
  if (layout === "system-flow" || layout === "research-system-concept") {
    const sections = markdownSectionMap(body);
    const sideSection = sections.get("side") ?? sections.get("signals") ?? "";
    return {
      steps: markdownListItems(sections.get("steps") ?? body),
      sideTitle: "Signals",
      sideItems: markdownListItems(sideSection),
      note: plainMarkdownText(sections.get("note") ?? ""),
    };
  }
  if (layout === "quote-callout") {
    return { quote: body.trim() };
  }
  if (layout === "code-walkthrough") {
    const code = firstFencedCode(body);
    return {
      language: code.language || "text",
      code: code.code,
      note: plainMarkdownText(body.replace(code.raw, "")),
      points: markdownListItems(body.replace(code.raw, "")),
    };
  }
  if (layout === "title-cover") {
    return { subtitle: body.trim() };
  }
  if (layout === "section-divider") {
    return { lead: body.trim() };
  }
  if (layout === "image-left-text-right") {
    const imageRef = firstAssetReference(body);
    return {
      image: imageRef,
      points: markdownListItems(body),
      note: plainMarkdownText(imageRef ? body.replace(`@${imageRef}`, "") : body),
    };
  }
  return { note: body.trim(), points: markdownListItems(body) };
}

function markdownSections(body) {
  const sections = [];
  let current = null;
  for (const line of String(body ?? "").split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) {
        sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      }
      current = { title: heading[1].trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  }
  return sections;
}

function markdownSectionMap(body) {
  return new Map(
    markdownSections(body).map((section) => [section.title.toLowerCase(), section.body]),
  );
}

function progressMetricFromText(text) {
  const match = String(text ?? "").match(/^(.+?)(?::|：)\s*(\d{1,3})(?:%|％)?$/);
  if (!match) {
    return { label: String(text ?? ""), value: 0 };
  }
  return {
    label: match[1].trim(),
    value: Math.max(0, Math.min(100, Number(match[2]))),
  };
}

function firstAssetReference(body) {
  return String(body ?? "").match(/@((?:assets\/)[^\s)\]}"'>,;]+)/)?.[1] ?? "";
}

function plainMarkdownText(body) {
  return String(body ?? "")
    .split(/\r?\n/)
    .filter((line) => !line.trim().match(/^[-*+]\s+/))
    .join("\n")
    .trim();
}

function markdownListItems(body) {
  const items = String(body ?? "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .match(/^[-*+]\s+(.+)$/)?.[1]
        ?.trim(),
    )
    .filter(Boolean);
  return items.length > 0 ? items : body.trim() ? [body.trim()] : [];
}

function firstFencedCode(body) {
  const match = String(body ?? "").match(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n```/);
  return {
    code: match?.[2] ?? "",
    language: match?.[1] ?? "text",
    raw: match?.[0] ?? "",
  };
}

function layoutExampleBody(layout) {
  const examples = {
    "title-cover": "关于 {{projectTitle}} 的演示",
    "section-divider": "这一部分先建立问题背景，再进入核心方法。",
    "bullet-list": "- 了解课程基本内容与目标\n- 掌握核心知识点\n- 通过课堂练习巩固理解",
    "two-column": "## 左侧观点\n\n- 要点一\n- 要点二\n\n## 右侧观点\n\n- 要点一\n- 要点二",
    "image-left-text-right": "@assets/example.png\n\n- 观察一\n- 观察二\n- 这张图对应的结论",
    "progress-dashboard":
      "## Done\n\n- 文献调研: 100\n- 初版原型: 60\n\n## Doing\n\n- 用户访谈: 40\n\n## Next\n\n- 整理实验计划\n\n## Problems\n\n- 数据样本还不够",
    "system-flow":
      "## Steps\n\n- 输入任务\n- 分析结构\n- 生成页面\n- 预览导出\n\n## Side\n\n- 约束\n- 素材\n- 模板\n\n## Note\n\n这页用来解释整体流程。",
    "quote-callout": "真正重要的不是装饰，而是让听众抓住这一页的判断。",
    "code-walkthrough":
      "这段代码展示递归 DFS 的核心状态变化。\n\n```python\ndef dfs(node):\n    visited.add(node)\n    for nxt in graph[node]:\n        if nxt not in visited:\n            dfs(nxt)\n```\n\n- visited 防止重复访问\n- 递归调用沿邻接点展开\n- 退出递归时回到上一层节点",
    "exercise-checklist":
      "- 手动写出 DFS 访问顺序\n- 解释 visited 的作用\n- 用同样方法追踪一个新例子",
    "lab-progress":
      "## Done\n\n- 系统设计: 80\n- 相关工作整理: 100\n\n## Doing\n\n- 实验准备: 50\n\n## Next\n\n- 补充用户任务\n\n## Problems\n\n- 评估指标还需要收敛",
    "research-system-concept":
      "## Steps\n\n- 参与者\n- 自然交互\n- 多模态采集\n- 行为分析\n- 结果反馈\n\n## Side\n\n- 语音\n- 表情\n- 操作日志\n\n## Note\n\n这页用于解释研究系统的整体概念。",
  };
  return examples[layout] ?? examples["bullet-list"];
}

function sanitizeId(value) {
  const sanitized = value.replace(/[^a-z0-9_-]/gi, "_").replace(/^_+|_+$/g, "");
  return sanitized || "slide";
}
