import yaml from "js-yaml";
import type {
  DeckAsset,
  DeckSlide,
  DeckSpec,
  LayoutContract,
  LayoutDefinition,
  LayoutId,
  ProjectConfig,
  SlideFile,
  SlideFrontmatter,
  SlideType,
  TaskFolderPayload,
  TemplateId,
  ThemeId,
} from "@/types";

export const slideTypes: SlideType[] = [
  "cover",
  "section",
  "bullet_summary",
  "comparison",
  "metric_grid",
  "principle_card",
  "code_explain",
  "trace_table",
  "process",
  "workflow",
  "checklist",
  "two_column",
  "note_callout",
  "closing",
];

export const layoutDefinitions: LayoutDefinition[] = [
  {
    id: "title-cover",
    name: "Title Cover",
    category: "basic",
    description: "Title, subtitle, optional hero image.",
    defaultProps: { subtitle: "Subtitle", kicker: "" },
  },
  {
    id: "section-divider",
    name: "Section Divider",
    category: "basic",
    description: "Large section title and lead.",
    defaultProps: { lead: "Short section lead" },
  },
  {
    id: "bullet-list",
    name: "Bullet List",
    category: "basic",
    description: "3-6 concise points.",
    defaultProps: { points: ["First point", "Second point", "Third point"] },
  },
  {
    id: "two-column",
    name: "Two Column",
    category: "basic",
    description: "Two panels for comparison or decomposition.",
    defaultProps: {
      columns: [
        { title: "Left", items: ["Item one", "Item two"] },
        { title: "Right", items: ["Item one", "Item two"] },
      ],
    },
  },
  {
    id: "image-left-text-right",
    name: "Image + Text",
    category: "basic",
    description: "Visual on the left, explanation on the right.",
    defaultProps: { image: "", alt: "", points: ["Observation", "Meaning", "Next step"] },
  },
  {
    id: "progress-dashboard",
    name: "Progress Dashboard",
    category: "research",
    description: "Done, doing, next plan, and problems.",
    defaultProps: {
      done: [{ label: "Literature review", value: 100 }],
      doing: [{ label: "Prototype", value: 60 }],
      nextPlan: ["Refine system diagram"],
      problem: ["Data collection method"],
    },
  },
  {
    id: "system-flow",
    name: "System Flow",
    category: "research",
    description: "Pipeline with side signals or notes.",
    defaultProps: {
      subtitle: "System concept",
      steps: ["User", "Interaction", "Data capture", "Analysis", "Output"],
      sideTitle: "Signals",
      sideItems: ["Voice", "Expression", "Behavior"],
      note: "Use natural interaction to reduce collection burden.",
    },
  },
  {
    id: "quote-callout",
    name: "Quote Callout",
    category: "basic",
    description: "One statement with optional source.",
    defaultProps: { quote: "The key message goes here.", source: "" },
  },
  {
    id: "code-walkthrough",
    name: "Code Walkthrough",
    category: "teaching",
    description: "Code with explanatory notes.",
    defaultProps: { language: "ts", code: "const value = 42", points: ["Explain the key line"] },
  },
  {
    id: "exercise-checklist",
    name: "Exercise Checklist",
    category: "teaching",
    description: "Classroom tasks or practice checklist.",
    defaultProps: { items: ["Task one", "Task two", "Task three"] },
  },
  {
    id: "lab-progress",
    name: "Lab Progress",
    category: "lab",
    description: "Group meeting progress dashboard.",
    defaultProps: {
      personName: "Name",
      researchTitle: "Research title",
      done: [{ label: "Related work", value: 100 }],
      doing: [{ label: "System concept", value: 70 }],
      nextPlan: ["Prototype plan"],
      problem: ["Natural data collection"],
    },
  },
  {
    id: "research-system-concept",
    name: "Research System Concept",
    category: "lab",
    description: "Research system concept flow.",
    defaultProps: {
      subtitle: "System concept",
      steps: ["Participant", "Interaction", "Multimodal capture", "Analysis", "Visualization"],
      sideTitle: "Available information",
      sideItems: ["Voice", "Expression", "Reaction speed", "Logs"],
      note: "A concept slide for discussion.",
    },
  },
];

export const layoutContracts: LayoutContract[] = [
  {
    layout: "title-cover",
    title: "Title Cover",
    summary: "Write one short subtitle or framing sentence.",
    help: [
      "Body text becomes props.subtitle.",
      "Use frontmatter props.kicker for a small label if needed.",
      "Keep this page short; details belong in later slides.",
    ],
    exampleBody: "面向试讲的解题课设计",
  },
  {
    layout: "section-divider",
    title: "Section Divider",
    summary: "Write the section lead in plain text.",
    help: ["Body text becomes props.lead.", "Use it to mark a new chapter or shift in the talk."],
    exampleBody: "这一部分先建立问题背景，再进入核心方法。",
  },
  {
    layout: "bullet-list",
    title: "Bullet List",
    summary: "Write a normal Markdown bullet list.",
    help: [
      "Each bullet becomes one item in props.points.",
      "3-6 bullets usually works best.",
      "If no bullets are found, the whole body becomes one point.",
    ],
    exampleBody: "- 了解课程基本内容与目标\n- 掌握核心知识点\n- 通过课堂练习巩固理解",
  },
  {
    layout: "two-column",
    title: "Two Column",
    summary: "Use two level-2 headings, each with bullets.",
    help: [
      "The first two ## sections become props.columns.",
      "Each section title becomes the column title.",
      "Bullets under each section become that column's items.",
      "For full control, write props.columns in frontmatter.",
    ],
    exampleBody: "## 左侧观点\n\n- 要点一\n- 要点二\n\n## 右侧观点\n\n- 要点一\n- 要点二",
  },
  {
    layout: "image-left-text-right",
    title: "Image + Text",
    summary: "Reference one image and write bullets for the explanation.",
    help: [
      "Write @assets/name.png anywhere in the body to set props.image.",
      "Bullets become props.points.",
      "The remaining text is kept as props.note.",
      "You can also set props.alt in frontmatter.",
    ],
    exampleBody: "@assets/example.png\n\n- 观察一\n- 观察二\n- 这张图对应的结论",
  },
  {
    layout: "progress-dashboard",
    title: "Progress Dashboard",
    summary: "Use Done, Doing, Next, and Problems sections.",
    help: [
      "## Done and ## Doing bullets become progress metrics.",
      "Use “Label: 70” to set a percentage value.",
      "## Next bullets become props.nextPlan.",
      "## Problems bullets become props.problem.",
    ],
    exampleBody:
      "## Done\n\n- 文献调研: 100\n- 初版原型: 60\n\n## Doing\n\n- 用户访谈: 40\n\n## Next\n\n- 整理实验计划\n\n## Problems\n\n- 数据样本还不够",
  },
  {
    layout: "system-flow",
    title: "System Flow",
    summary: "Use Steps, Side, and Note sections.",
    help: [
      "## Steps bullets become the main flow.",
      "## Side title becomes props.sideTitle.",
      "Bullets under ## Side become props.sideItems.",
      "## Note text becomes props.note.",
    ],
    exampleBody:
      "## Steps\n\n- 输入任务\n- 分析结构\n- 生成页面\n- 预览导出\n\n## Side\n\n- 约束\n- 素材\n- 模板\n\n## Note\n\n这页用来解释整体流程。",
  },
  {
    layout: "quote-callout",
    title: "Quote Callout",
    summary: "Write one strong sentence.",
    help: [
      "Body text becomes props.quote.",
      "Use frontmatter props.source if you need attribution.",
    ],
    exampleBody: "真正重要的不是装饰，而是让听众抓住这一页的判断。",
  },
  {
    layout: "code-walkthrough",
    title: "Code Walkthrough",
    summary: "Write context, one fenced code block, then bullets.",
    help: [
      "The first fenced code block becomes props.code.",
      "The fence language becomes props.language.",
      "Bullets become props.points.",
      "Non-code prose is kept as props.note.",
    ],
    exampleBody:
      "这段代码展示递归 DFS 的核心状态变化。\n\n```python\ndef dfs(node):\n    visited.add(node)\n    for nxt in graph[node]:\n        if nxt not in visited:\n            dfs(nxt)\n```\n\n- visited 防止重复访问\n- 递归调用沿邻接点展开\n- 退出递归时回到上一层节点",
  },
  {
    layout: "exercise-checklist",
    title: "Exercise Checklist",
    summary: "Write a checklist-style bullet list.",
    help: [
      "Each bullet becomes one item in props.items.",
      "Use this for classroom tasks, practice steps, or review prompts.",
    ],
    exampleBody: "- 手动写出 DFS 访问顺序\n- 解释 visited 的作用\n- 用同样方法追踪一个新例子",
  },
  {
    layout: "lab-progress",
    title: "Lab Progress",
    summary: "Use metadata plus Done, Doing, Next, and Problems sections.",
    help: [
      "Use frontmatter props.personName and props.researchTitle for identity fields.",
      "## Done and ## Doing bullets become progress metrics.",
      "Use “Label: 70” to set a percentage value.",
      "## Next and ## Problems become lists.",
    ],
    exampleBody:
      "## Done\n\n- 系统设计: 80\n- 相关工作整理: 100\n\n## Doing\n\n- 实验准备: 50\n\n## Next\n\n- 补充用户任务\n\n## Problems\n\n- 评估指标还需要收敛",
  },
  {
    layout: "research-system-concept",
    title: "Research System Concept",
    summary: "Use Steps, Side, and Note sections for a research concept flow.",
    help: [
      "## Steps bullets become props.steps.",
      "## Side title becomes props.sideTitle.",
      "Bullets under ## Side become props.sideItems.",
      "## Note text becomes props.note.",
    ],
    exampleBody:
      "## Steps\n\n- 参与者\n- 自然交互\n- 多模态采集\n- 行为分析\n- 结果反馈\n\n## Side\n\n- 语音\n- 表情\n- 操作日志\n\n## Note\n\n这页用于解释研究系统的整体概念。",
  },
];

export const templatePresets: Array<{
  id: TemplateId;
  label: string;
  theme: ThemeId;
  layouts: LayoutId[];
}> = [
  {
    id: "teaching",
    label: "Teaching",
    theme: "lecture-light",
    layouts: [
      "title-cover",
      "section-divider",
      "bullet-list",
      "two-column",
      "image-left-text-right",
      "code-walkthrough",
      "exercise-checklist",
      "quote-callout",
    ],
  },
  {
    id: "clean",
    label: "Clean",
    theme: "clean-light",
    layouts: [
      "title-cover",
      "section-divider",
      "bullet-list",
      "two-column",
      "image-left-text-right",
      "progress-dashboard",
      "system-flow",
      "quote-callout",
    ],
  },
];

export const themeOptions: Array<{ id: ThemeId; label: string; template: TemplateId }> = [
  { id: "lecture-light", label: "Lecture Light", template: "teaching" },
  { id: "clean-light", label: "Clean Light", template: "clean" },
];

export const initialDeck: DeckSpec = {
  meta: {
    title: "Graph DFS and Postfix Notation",
    language: "zh-CN",
    theme: "lecture-light",
    template: "teaching",
  },
  slides: [
    {
      id: "cover",
      layout: "title-cover",
      title: "图的深度优先探索与后缀记法",
      props: {
        subtitle: "面向试讲的解题课设计",
      },
      speakerNotes: "开场：今天不是讲背答案，而是讲如何从程序行为推回算法结构。",
    },
    {
      id: "goals",
      layout: "bullet-list",
      title: "这节课要解决什么",
      props: {
        points: [
          "题型 1 - DFS - 读 Python 递归程序",
          "题型 2 - Stack - 后缀记法求值",
          "核心能力 - Trace - 手动追踪状态变化",
        ],
      },
    },
    {
      id: "lesson-thread",
      layout: "quote-callout",
      title: "讲课主线",
      props: {
        quote: "会追踪状态，就能读懂程序",
        source: "把每一步的状态写出来：当前顶点、visited、forest、栈。",
      },
    },
    {
      id: "problem-breakdown",
      layout: "two-column",
      title: "题目拆解",
      props: {
        columns: [
          {
            title: "图搜索",
            items: ["读懂 graph 的邻接表结构", "追踪 dfs(start) 的递归展开"],
          },
          {
            title: "后缀记法",
            items: ["计算表达式结果", "用栈模拟求值过程"],
          },
        ],
      },
    },
    {
      id: "graph-structure",
      layout: "code-walkthrough",
      title: "DFS：先看数据结构",
      props: {
        language: "python",
        code: `graph = {
    "A": {"B", "D"},
    "B": {"A", "C", "E"},
    "G": {"H"},
    "H": {"G"},
}`,
        note: "这是邻接表。A-F 是一个连通分量，G-H 是另一个连通分量。",
      },
    },
    {
      id: "forest-trace",
      layout: "system-flow",
      title: "手动追踪 forest",
      props: {
        steps: [
          "n = A / call DFS / forest = [{A,B,C,D,E,F}]",
          "n = G / call DFS / forest = [{A,B,C,D,E,F}, {G,H}]",
        ],
        sideTitle: "Trace focus",
        sideItems: ["Outer loop", "Action", "forest"],
      },
    },
    {
      id: "practice",
      layout: "exercise-checklist",
      title: "课堂练习",
      props: {
        items: [
          "给一张小图，手动写出 DFS visited 顺序",
          "把递归 DFS 改写成显式栈版本",
          "计算一个新的后缀表达式",
        ],
      },
    },
  ],
};

export function validateDeck(deck: DeckSpec): string[] {
  const issues: string[] = [];
  if (!deck.meta.title.trim()) {
    issues.push("Deck title is required.");
  }
  if (deck.meta.template && !templatePresets.some((preset) => preset.id === deck.meta.template)) {
    issues.push("Template must be teaching or clean.");
  }
  if (!themeOptions.some((theme) => theme.id === deck.meta.theme)) {
    issues.push("Theme should be lecture-light or clean-light.");
  }
  const assetIds = new Set((deck.assets ?? []).map((asset) => asset.id));
  const assetPaths = new Set((deck.assets ?? []).map((asset) => asset.path));
  const slideIds = new Set<string>();
  deck.slides.forEach((slide, index) => {
    if (!slide.title.trim()) {
      issues.push(`Slide ${index + 1} needs a title.`);
    }
    if (!slide.id.trim()) {
      issues.push(`Slide ${index + 1} needs an id.`);
    }
    if (slideIds.has(slide.id)) {
      issues.push(`Slide ${index + 1} duplicates slide id "${slide.id}".`);
    }
    slideIds.add(slide.id);
    if (!slide.layout && !slide.type) {
      issues.push(`Slide ${index + 1} needs a layout.`);
    }
    if (slide.layout && !layoutDefinitions.some((layout) => layout.id === slide.layout)) {
      issues.push(`Slide ${index + 1} uses unsupported layout "${slide.layout}".`);
    }
    if (slide.type && !slideTypes.includes(slide.type)) {
      issues.push(`Slide ${index + 1} uses unsupported legacy type "${slide.type}".`);
    }
    if (slide.visual && !assetIds.has(slide.visual.assetId)) {
      issues.push(`Slide ${index + 1} references a missing visual asset.`);
    }
    const image = slideProps(slide).image;
    if (typeof image === "string" && image.startsWith("assets/") && !assetPaths.has(image)) {
      issues.push(`Slide ${index + 1} references a missing image asset.`);
    }
  });
  return issues;
}

export function createEmptyTaskDeck(task: TaskFolderPayload): DeckSpec {
  return task.deck;
}

export function normalizeTaskDeck(deck: DeckSpec, task: TaskFolderPayload): DeckSpec {
  return {
    ...deck,
    meta: {
      ...deck.meta,
      template: deck.meta.template ?? "teaching",
      theme:
        deck.meta.theme === "teaching"
          ? "lecture-light"
          : deck.meta.theme || (deck.meta.template === "clean" ? "clean-light" : "lecture-light"),
    },
    assets: mergeDeckAssets(deck.assets ?? [], task.assets),
    slides: deck.slides.map(normalizeSlideForLayout),
  };
}

export function mergeDeckAssets(deckAssets: DeckAsset[], scannedAssets: DeckAsset[]): DeckAsset[] {
  const byPath = new Map<string, DeckAsset>();
  for (const asset of deckAssets) {
    byPath.set(asset.path, asset);
  }
  for (const asset of scannedAssets) {
    const existing = byPath.get(asset.path);
    byPath.set(asset.path, existing ? { ...asset, ...existing } : asset);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function normalizeSlideForLayout(slide: DeckSlide): DeckSlide {
  if (slide.layout && slide.props) {
    return slide;
  }
  const layout = slide.layout ?? defaultLayoutForSlideType(slide.type);
  return {
    ...slide,
    layout,
    props: slide.props ?? legacySlideProps(slide),
  };
}

export function createDefaultSlide(layout: LayoutId, deck: DeckSpec): DeckSlide {
  const definition = layoutDefinition(layout);
  const id = uniqueSlideId(layout, deck);
  return {
    id,
    layout,
    title: definition.name,
    props: structuredClone(definition.defaultProps),
  };
}

export function defaultLayoutForSlideType(type: SlideType | undefined): LayoutId {
  switch (type) {
    case "cover":
      return "title-cover";
    case "section":
      return "section-divider";
    case "comparison":
    case "two_column":
      return "two-column";
    case "code_explain":
      return "code-walkthrough";
    case "checklist":
      return "exercise-checklist";
    case "process":
    case "workflow":
    case "trace_table":
      return "system-flow";
    case "note_callout":
    case "closing":
      return "quote-callout";
    default:
      return "bullet-list";
  }
}

export function legacySlideProps(slide: DeckSlide): Record<string, unknown> {
  const content = slide.content ?? {};
  switch (slide.type) {
    case "cover":
      return { subtitle: stringValue(content, "subtitle") };
    case "section":
      return { lead: stringValue(content, "lead") };
    case "comparison":
    case "two_column":
      return { columns: arrayValue(content, "columns") };
    case "code_explain":
      return {
        language: stringValue(content, "language") || "text",
        code: stringValue(content, "code"),
        note: stringValue(content, "note"),
        points: arrayValue(content, "points"),
      };
    case "trace_table":
      return {
        steps: arrayValue(content, "rows").map((row) =>
          Array.isArray(row)
            ? row.map((cell) => String(cell ?? "")).join(" / ")
            : String(row ?? ""),
        ),
        sideTitle: "Columns",
        sideItems: arrayValue(content, "columns"),
        note: stringValue(content, "note"),
      };
    case "process":
      return { points: arrayValue(content, "steps") };
    case "workflow":
      return {
        steps: arrayValue(content, "steps").map((step) =>
          [objectString(step, "label"), objectString(step, "body")].filter(Boolean).join(": "),
        ),
      };
    case "checklist":
      return { items: arrayValue(content, "items") };
    case "note_callout":
      return { quote: stringValue(content, "body") };
    case "closing":
      return { quote: stringValue(content, "statement") };
    case "metric_grid":
      return {
        points: arrayValue(content, "metrics").map((metric) =>
          [
            objectString(metric, "label"),
            objectString(metric, "value"),
            objectString(metric, "note"),
          ]
            .filter(Boolean)
            .join(" - "),
        ),
      };
    case "principle_card":
      return {
        points: arrayValue(content, "cards").map((card) =>
          [objectString(card, "title"), objectString(card, "body")].filter(Boolean).join(": "),
        ),
      };
    default:
      return content;
  }
}

export function slideProps(slide: DeckSlide): Record<string, unknown> {
  return slide.props ?? legacySlideProps(slide);
}

export function slideLayoutId(slide: DeckSlide): LayoutId | string {
  return slide.layout ?? defaultLayoutForSlideType(slide.type);
}

export function layoutDefinition(layoutId: LayoutId | string): LayoutDefinition {
  return (
    layoutDefinitions.find((layout) => layout.id === layoutId) ??
    layoutDefinitions.find((layout) => layout.id === "bullet-list")!
  );
}

export function layoutLabel(layoutId: LayoutId | string): string {
  return layoutDefinition(layoutId).name;
}

export function layoutContract(layoutId: LayoutId | string): LayoutContract {
  return (
    layoutContracts.find((contract) => contract.layout === layoutId) ??
    layoutContracts.find((contract) => contract.layout === "bullet-list")!
  );
}

export function layoutExampleBody(layoutId: LayoutId | string): string {
  return layoutContract(layoutId).exampleBody;
}

export function uniqueSlideId(base: string, deck: DeckSpec): string {
  const existing = new Set(deck.slides.map((slide) => slide.id));
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const root = normalized || "slide";
  let candidate = root;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  return candidate;
}

export function deckToYaml(deck: DeckSpec): string {
  return yaml.dump(deck, {
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
  });
}

export function slideToYaml(slide: DeckSlide): string {
  return yaml.dump(slide, {
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
  });
}

export function parseDeckYaml(value: string, task: TaskFolderPayload | null): DeckSpec {
  const parsed = yaml.load(value);
  const deck = coerceDeckSpec(parsed);
  return task ? normalizeTaskDeck(deck, task) : deck;
}

export function parseSlideYaml(value: string): DeckSlide {
  return normalizeSlideForLayout(coerceDeckSlide(yaml.load(value)));
}

export function parseSlideMarkdownFile(fileName: string, markdown: string): SlideFile {
  const { body, frontmatter } = parseSlideMarkdown(markdown);
  const slide = slideFromMarkdown(frontmatter, body);
  return {
    fileName,
    path: `slides/${fileName}`,
    markdown,
    frontmatter,
    body,
    slide,
  };
}

export function parseSlideMarkdown(markdown: string): {
  frontmatter: SlideFrontmatter;
  body: string;
} {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error("slide markdown must start with frontmatter.");
  }
  const parsed = yaml.load(match[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("slide frontmatter must be an object.");
  }
  const frontmatter = parsed as Partial<SlideFrontmatter>;
  if (typeof frontmatter.id !== "string" || !frontmatter.id.trim()) {
    throw new Error("frontmatter.id must be a non-empty string.");
  }
  if (typeof frontmatter.layout !== "string" || !frontmatter.layout.trim()) {
    throw new Error("frontmatter.layout must be a non-empty string.");
  }
  if (typeof frontmatter.title !== "string") {
    throw new Error("frontmatter.title must be a string.");
  }
  if (
    frontmatter.props &&
    (typeof frontmatter.props !== "object" || Array.isArray(frontmatter.props))
  ) {
    throw new Error("frontmatter.props must be an object.");
  }
  return {
    frontmatter: frontmatter as SlideFrontmatter,
    body: markdown.slice(match[0].length).trim(),
  };
}

export function slideFromMarkdown(frontmatter: SlideFrontmatter, body: string): DeckSlide {
  const derivedProps = markdownBodyToProps(frontmatter.layout, body);
  return {
    id: frontmatter.id,
    layout: frontmatter.layout,
    title: frontmatter.title,
    props: {
      ...derivedProps,
      ...frontmatter.props,
    },
    speakerNotes: frontmatter.speakerNotes,
  };
}

export function markdownBodyToProps(
  layout: LayoutId | string,
  body: string,
): Record<string, unknown> {
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
          : layoutDefinition("two-column").defaultProps.columns,
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
    const image = firstAssetReference(body);
    return {
      image,
      points: markdownListItems(body),
      note: plainMarkdownText(image ? body.replace(`@${image}`, "") : body),
    };
  }
  return { note: body.trim(), points: markdownListItems(body) };
}

export function updateSlideMarkdownBody(markdown: string, body: string): string {
  const parsed = parseSlideMarkdown(markdown);
  return slideMarkdownToText(parsed.frontmatter, body);
}

export function markdownSections(body: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of body.split(/\r?\n/)) {
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

export function markdownSectionMap(body: string): Map<string, string> {
  return new Map(
    markdownSections(body).map((section) => [section.title.toLowerCase(), section.body]),
  );
}

export function progressMetricFromText(text: string): { label: string; value: number } {
  const match = text.match(/^(.+?)(?::|：)\s*(\d{1,3})(?:%|％)?$/);
  if (!match) {
    return { label: text, value: 0 };
  }
  return {
    label: match[1].trim(),
    value: Math.max(0, Math.min(100, Number(match[2]))),
  };
}

export function firstAssetReference(body: string): string {
  return body.match(/@((?:assets\/)[^\s)\]}"'>,;]+)/)?.[1] ?? "";
}

export function plainMarkdownText(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !line.trim().match(/^[-*+]\s+/))
    .join("\n")
    .trim();
}

export function markdownListItems(body: string): string[] {
  const items = body
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .match(/^[-*+]\s+(.+)$/)?.[1]
        ?.trim(),
    )
    .filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : body.trim() ? [body.trim()] : [];
}

export function firstFencedCode(body: string): { code: string; language: string; raw: string } {
  const match = body.match(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n```/);
  return {
    code: match?.[2] ?? "",
    language: match?.[1] ?? "text",
    raw: match?.[0] ?? "",
  };
}

export function slideMarkdownToText(frontmatter: SlideFrontmatter, body: string): string {
  return [
    "---",
    yaml.dump(frontmatter, { lineWidth: 100, noRefs: true }).trim(),
    "---",
    "",
    body.trim(),
    "",
  ].join("\n");
}

export function updateSlideMarkdownFrontmatter(
  markdown: string,
  update: Partial<SlideFrontmatter>,
): string {
  const parsed = parseSlideMarkdown(markdown);
  return slideMarkdownToText(
    {
      ...parsed.frontmatter,
      ...update,
    },
    parsed.body,
  );
}

export function deckFromProjectFiles(
  config: ProjectConfig,
  slideFiles: SlideFile[],
  assets: DeckAsset[],
): DeckSpec {
  return {
    meta: {
      title: config.title,
      language: config.language,
      template: config.template,
      theme: config.theme,
    },
    assets,
    slides: slideFiles.map((slideFile) => slideFile.slide),
  };
}

export function coerceDeckSpec(value: unknown): DeckSpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("root must be a YAML object.");
  }
  const candidate = value as Partial<DeckSpec>;
  if (!candidate.meta || typeof candidate.meta !== "object") {
    throw new Error("meta is required.");
  }
  const meta = candidate.meta as Partial<DeckSpec["meta"]>;
  if (typeof meta.title !== "string") {
    throw new Error("meta.title must be a string.");
  }
  if (typeof meta.language !== "string") {
    throw new Error("meta.language must be a string.");
  }
  if (typeof meta.theme !== "string") {
    throw new Error("meta.theme must be a string.");
  }
  if (!Array.isArray(candidate.slides)) {
    throw new Error("slides must be an array.");
  }
  for (const [index, slide] of candidate.slides.entries()) {
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
      throw new Error(`slides[${index}] must be an object.`);
    }
    const candidateSlide = slide as Partial<DeckSlide>;
    if (typeof candidateSlide.id !== "string") {
      throw new Error(`slides[${index}].id must be a string.`);
    }
    if (typeof candidateSlide.title !== "string") {
      throw new Error(`slides[${index}].title must be a string.`);
    }
    const hasLayout = typeof candidateSlide.layout === "string";
    const hasLegacyType = typeof candidateSlide.type === "string";
    if (!hasLayout && !hasLegacyType) {
      throw new Error(`slides[${index}] must include layout or legacy type.`);
    }
    if (
      hasLayout &&
      (!candidateSlide.props ||
        typeof candidateSlide.props !== "object" ||
        Array.isArray(candidateSlide.props))
    ) {
      throw new Error(`slides[${index}].props must be an object.`);
    }
    if (
      hasLegacyType &&
      (!candidateSlide.content ||
        typeof candidateSlide.content !== "object" ||
        Array.isArray(candidateSlide.content))
    ) {
      throw new Error(`slides[${index}].content must be an object.`);
    }
  }
  return candidate as DeckSpec;
}

export function coerceDeckSlide(value: unknown): DeckSlide {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("slide YAML must be an object.");
  }
  const candidate = value as Partial<DeckSlide>;
  if (typeof candidate.id !== "string" || !candidate.id.trim()) {
    throw new Error("slide.id must be a non-empty string.");
  }
  if (typeof candidate.title !== "string") {
    throw new Error("slide.title must be a string.");
  }
  const hasLayout = typeof candidate.layout === "string";
  const hasLegacyType = typeof candidate.type === "string";
  if (!hasLayout && !hasLegacyType) {
    throw new Error("slide must include layout or legacy type.");
  }
  if (
    hasLayout &&
    (!candidate.props || typeof candidate.props !== "object" || Array.isArray(candidate.props))
  ) {
    throw new Error("slide.props must be an object.");
  }
  if (
    hasLegacyType &&
    (!candidate.content ||
      typeof candidate.content !== "object" ||
      Array.isArray(candidate.content))
  ) {
    throw new Error("slide.content must be an object.");
  }
  return candidate as DeckSlide;
}

export function wordCount(value: string): number {
  return value.trim().length;
}

export function stringValue(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function arrayValue(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

export function objectString(source: unknown, key: string): string {
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return "";
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function assetFileUrl(projectPath: string, assetPath: string): string {
  const absolutePath = `${projectPath.replace(/\/+$/g, "")}/${assetPath}`;
  return `file://${absolutePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function firstContentText(content: Record<string, unknown>): string {
  for (const value of Object.values(content)) {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return `${value.length} items`;
    }
  }
  return "";
}
