import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";
import yaml from "js-yaml";
import {
  BadgeCheckIcon,
  ClipboardPlusIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  FilePlus2Icon,
  FolderOpenIcon,
  ImageIcon,
  PanelsTopLeftIcon,
  PresentationIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import "./styles.css";

declare global {
  interface SlideforgeBridge {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
    showWorkbenchWindow(): Promise<void>;
    showWelcomeWindow(): Promise<void>;
    windowAction(action: "close" | "minimize"): Promise<void>;
    openActivePreview(slide: DeckSlide): Promise<boolean>;
    updateActivePreview(slide: DeckSlide): Promise<void>;
    onActiveSlideUpdated(callback: (slide: DeckSlide) => void): () => void;
    activePreviewReady(): Promise<void>;
  }

  interface Window {
    __slideforgeRoot?: Root;
    slideforge?: SlideforgeBridge;
  }
}

type SlideType =
  | "cover"
  | "section"
  | "bullet_summary"
  | "comparison"
  | "metric_grid"
  | "principle_card"
  | "code_explain"
  | "trace_table"
  | "process"
  | "workflow"
  | "checklist"
  | "two_column"
  | "note_callout"
  | "closing";

type TemplateId = "teaching" | "clean";
type ThemeId = "lecture-light" | "clean-light";
type LayoutCategory = "basic" | "teaching" | "research" | "lab";
type LayoutId =
  | "title-cover"
  | "section-divider"
  | "bullet-list"
  | "two-column"
  | "image-left-text-right"
  | "progress-dashboard"
  | "system-flow"
  | "quote-callout"
  | "code-walkthrough"
  | "exercise-checklist"
  | "lab-progress"
  | "research-system-concept";

interface DeckSpec {
  meta: {
    title: string;
    language: string;
    theme: string;
    template?: TemplateId;
  };
  theme?: ThemeTokens;
  assets?: DeckAsset[];
  slides: DeckSlide[];
}

interface ThemeTokens {
  id?: string;
  accent?: string;
  background?: string;
  text?: string;
  muted?: string;
  logo?: string;
  footer?: string;
  fontFamily?: string;
}

interface DeckAsset {
  id: string;
  path: string;
  kind: "image" | "text";
  description?: string;
}

interface VisualRef {
  assetId: string;
  alt?: string;
  role?: "primary" | "supporting";
}

interface DeckSlide {
  id: string;
  layout?: LayoutId | string;
  props?: Record<string, unknown>;
  type?: SlideType;
  title: string;
  content?: Record<string, unknown>;
  visual?: VisualRef;
  speakerNotes?: string;
  animation?: {
    preset?: "none" | "step_reveal" | "highlight_key_points";
  };
}

interface LayoutDefinition {
  id: LayoutId;
  name: string;
  category: LayoutCategory;
  description: string;
  defaultProps: Record<string, unknown>;
}

interface ReferencedAssetContent {
  assetId: string;
  path: string;
  kind: "image" | "text";
  text?: string;
}

interface EnvStatus {
  hasKey: boolean;
  hasModel: boolean;
  message: string;
}

interface TaskFolderPayload {
  path: string;
  name: string;
  brief: string;
  outline: string;
  deck?: DeckSpec | null;
  assets: DeckAsset[];
  referencedAssets: ReferencedAssetContent[];
  missingAssetRefs: string[];
  envStatus: EnvStatus;
}

interface GenerateDeckResult {
  deck: DeckSpec;
  validationErrors: string[];
  repaired: boolean;
  rawSummary: string;
}

interface BuildDeckResult {
  slidevDir: string;
  pdfPath?: string | null;
  url?: string;
  warnings: string[];
  log: string;
}

interface VaultProject {
  name: string;
  path: string;
  lastOpenedAt: string;
  exists: boolean;
}

interface VaultPayload {
  projects: VaultProject[];
}

const slideTypes: SlideType[] = [
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

const layoutDefinitions: LayoutDefinition[] = [
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

const templatePresets: Array<{
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

const themeOptions: Array<{ id: ThemeId; label: string; template: TemplateId }> = [
  { id: "lecture-light", label: "Lecture Light", template: "teaching" },
  { id: "clean-light", label: "Clean Light", template: "clean" },
];

const initialDeck: DeckSpec = {
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
      speakerNotes:
        "开场：今天不是讲背答案，而是讲如何从程序行为推回算法结构。",
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

function App() {
  if (window.location.hash === "#/active-preview") {
    return <ActiveSlidePreviewApp />;
  }

  return <DeckWorkbench />;
}

function DeckWorkbench() {
  const [deck, setDeck] = useState(initialDeck);
  const [deckYamlText, setDeckYamlText] = useState(() => deckToYaml(initialDeck));
  const [deckYamlError, setDeckYamlError] = useState("");
  const [selectedSlideId, setSelectedSlideId] = useState(deck.slides[0]?.id ?? "");
  const [task, setTask] = useState<TaskFolderPayload | null>(null);
  const [taskStatus, setTaskStatus] = useState("No project opened.");
  const [taskError, setTaskError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [vaultProjects, setVaultProjects] = useState<VaultProject[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [layoutToAdd, setLayoutToAdd] = useState<LayoutId>("bullet-list");
  const previewWindow = useRef<Window | null>(null);

  const currentTemplate = deck.meta.template ?? "teaching";
  const currentPreset =
    templatePresets.find((preset) => preset.id === currentTemplate) ?? templatePresets[0];
  const templateLayouts = currentPreset.layouts;
  const selectedIndex = Math.max(
    0,
    deck.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const selectedSlide = deck.slides[selectedIndex] ?? deck.slides[0];
  const validation = useMemo(
    () => [
      ...(deckYamlError ? [`deck.yaml: ${deckYamlError}`] : []),
      ...validateDeck(deck),
    ],
    [deck, deckYamlError],
  );
  useEffect(() => {
    if (!task || !selectedSlide) {
      return;
    }
    if (previewWindow.current && !previewWindow.current.closed) {
      writePreviewWindow(previewWindow.current, selectedSlide);
    }
    emitActiveSlideToDesktopPreview(selectedSlide);
  }, [selectedSlide, task]);

  useEffect(() => {
    void refreshVault();
    void hydrateInitialTask();
  }, []);

  async function openActivePreview() {
    if (!selectedSlide) {
      return;
    }

    const openedDesktopPreview = await openDesktopActivePreview(selectedSlide);
    if (openedDesktopPreview) {
      return;
    }

    const target = window.open("", "slideforge-active-slide", "width=960,height=640");
    if (!target) {
      return;
    }

    previewWindow.current = target;
    writePreviewWindow(target, selectedSlide);
    target.focus();
  }

  async function refreshVault() {
    if (!isDesktopRuntime()) {
      setTaskStatus("Project vault is available in the desktop window.");
      return;
    }
    try {
      const payload = await invokeDesktop<VaultPayload>("list_vault_projects");
      setVaultProjects(payload.projects);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : String(error));
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) {
      setTaskError("Project name is required.");
      return;
    }
    await runTaskAction("Create project", async () => {
      const payload = await invokeDesktop<TaskFolderPayload | null>("create_project", {
        projectName: newProjectName,
      });
      if (!payload) {
        setTaskStatus("Create project cancelled.");
        return;
      }
      const shouldOpenWorkbenchWindow = !task;
      await openTaskPayload(payload, shouldOpenWorkbenchWindow);
      setNewProjectName("");
      setTaskStatus(`Created ${payload.name}.`);
    });
  }

  async function openTaskFolder() {
    await runTaskAction("Open project", async () => {
      const payload = await invokeDesktop<TaskFolderPayload | null>("open_task_folder");
      if (!payload) {
        setTaskStatus("Open project cancelled.");
        return;
      }
      await openTaskPayload(payload, !task);
      setTaskStatus(`Opened ${payload.name}.`);
    });
  }

  async function openVaultProject(project: VaultProject) {
    await runTaskAction("Open vault project", async () => {
      const shouldOpenWorkbenchWindow = !task;
      const payload = await invokeDesktop<TaskFolderPayload>("load_task_folder", {
        path: project.path,
      });
      await openTaskPayload(payload, shouldOpenWorkbenchWindow);
      setTaskStatus(`Opened ${payload.name}.`);
    });
  }

  async function reloadTaskFolder() {
    if (!task) {
      setTaskError("Open a task folder first.");
      return;
    }
    await runTaskAction("Reload task folder", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("load_task_folder", {
        path: task.path,
      });
      applyTaskPayload(payload);
      setTaskStatus(`Reloaded ${payload.name}.`);
    });
  }

  async function saveDeck() {
    if (!task) {
      setTaskError("Open a task folder before saving deck.yaml.");
      return;
    }
    if (deckYamlError) {
      setTaskError("Fix deck.yaml before saving.");
      return;
    }
    await runTaskAction("Save deck", async () => {
      await invokeDesktop("save_task_deck", {
        path: task.path,
        deck,
      });
      setTaskStatus("Saved deck.yaml.");
    });
  }

  async function draftDeckWithAi() {
    if (!task) {
      setTaskError("Open a task folder before drafting with AI.");
      return;
    }
    if (!task.envStatus.hasKey || !task.envStatus.hasModel) {
      setTaskError(`AI unavailable: ${task.envStatus.message}`);
      return;
    }
    await runTaskAction("Draft with AI", async () => {
      const result = await invokeDesktop<GenerateDeckResult>("generate_task_deck", {
        path: task.path,
      });
      const generatedDeck = normalizeTaskDeck(result.deck, task);
      applyDeck(generatedDeck, true);
      setTask((current) =>
        current
          ? {
              ...current,
              deck: generatedDeck,
            }
          : current,
      );
      setTaskStatus(
        result.repaired
          ? "AI draft completed after one repair pass. Review before saving."
          : "AI draft completed. Review before saving.",
      );
    });
  }

  async function previewDeck() {
    if (!task) {
      setTaskError("Open a task folder before previewing the deck.");
      return;
    }
    if (deckYamlError) {
      setTaskError("Fix deck.yaml before previewing the deck.");
      return;
    }
    await runTaskAction("Preview deck", async () => {
      const result = await invokeDesktop<BuildDeckResult>("preview_task_deck", {
        path: task.path,
        deck,
      });
      setTaskStatus(`Preview deck at ${result.url ?? "http://localhost:3030/"}.`);
      window.open(result.url ?? "http://localhost:3030/", "_blank");
    });
  }

  async function exportPdf() {
    if (!task) {
      setTaskError("Open a task folder before exporting PDF.");
      return;
    }
    if (deckYamlError) {
      setTaskError("Fix deck.yaml before exporting PDF.");
      return;
    }
    await runTaskAction("Export PDF", async () => {
      const result = await invokeDesktop<BuildDeckResult>("build_task_deck", {
        path: task.path,
        deck,
      });
      const pdf = result.pdfPath ? ` PDF: ${result.pdfPath}` : "";
      const warning = result.warnings.length > 0 ? ` ${result.warnings[0]}` : "";
      setTaskStatus(`Exported Slidev project: ${result.slidevDir}.${pdf}${warning}`);
    });
  }

  async function importAssets(filePaths?: string[]) {
    if (!task) {
      setTaskError("Open a project before importing assets.");
      return;
    }
    await runTaskAction("Import assets", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("import_asset_files", {
        path: task.path,
        filePaths,
      });
      applyTaskPayload(payload);
      setTaskStatus(`Imported assets. ${payload.assets.length} asset(s) in project.`);
    });
  }

  function handleAssetDrop(event: React.DragEvent) {
    event.preventDefault();
    const filePaths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((filePath): filePath is string => Boolean(filePath));
    if (filePaths.length === 0) {
      setTaskError("This drop did not include local file paths. Use Import Assets instead.");
      return;
    }
    void importAssets(filePaths);
  }

  function addSlide() {
    const nextSlide = createDefaultSlide(layoutToAdd, deck);
    applyDeck(
      {
        ...deck,
        slides: [...deck.slides, nextSlide],
      },
      true,
      nextSlide.id,
    );
    setTaskStatus(`Added ${nextSlide.type} slide.`);
  }

  function duplicateSlide() {
    if (!selectedSlide) {
      return;
    }
    const duplicate = {
      ...structuredClone(selectedSlide),
      id: uniqueSlideId(`${selectedSlide.id}-copy`, deck),
      title: `${selectedSlide.title} Copy`,
    };
    const slides = [...deck.slides];
    slides.splice(selectedIndex + 1, 0, duplicate);
    applyDeck({ ...deck, slides }, true, duplicate.id);
    setTaskStatus("Duplicated current slide.");
  }

  function deleteSlide() {
    if (!selectedSlide) {
      return;
    }
    if (deck.slides.length <= 1) {
      setTaskError("A deck must keep at least one slide.");
      return;
    }
    const slides = deck.slides.filter((slide) => slide.id !== selectedSlide.id);
    const nextSelected = slides[Math.min(selectedIndex, slides.length - 1)]?.id ?? "";
    applyDeck({ ...deck, slides }, true, nextSelected);
    setTaskStatus("Deleted current slide.");
  }

  function updateTemplate(template: TemplateId) {
    const preset = templatePresets.find((item) => item.id === template) ?? templatePresets[0];
    applyDeck(
      {
        ...deck,
        meta: {
          ...deck.meta,
          template,
          theme: preset.theme,
        },
      },
      true,
      selectedSlideId,
    );
    setLayoutToAdd(preset.layouts.includes(layoutToAdd) ? layoutToAdd : preset.layouts[0]);
    setTaskStatus(`Selected ${preset.label} template.`);
  }

  function updateTheme(theme: ThemeId) {
    const option = themeOptions.find((item) => item.id === theme);
    applyDeck(
      {
        ...deck,
        meta: {
          ...deck.meta,
          theme,
          template: option?.template ?? deck.meta.template ?? "teaching",
        },
      },
      true,
      selectedSlideId,
    );
    setTaskStatus(`Selected ${theme}.`);
  }

  function attachVisualAsset(asset: DeckAsset) {
    if (!selectedSlide || asset.kind !== "image") {
      return;
    }
    const slides = deck.slides.map((slide) =>
      slide.id === selectedSlide.id
        ? {
            ...slide,
            props: {
              ...slideProps(slide),
              image: asset.path,
              alt: asset.description || asset.path,
            },
          }
        : slide,
    );
    applyDeck({ ...deck, slides }, true, selectedSlide.id);
    setTaskStatus(`Attached ${asset.path} to current slide.`);
  }

  async function copyAssetReference(asset: DeckAsset) {
    const snippet =
      asset.kind === "image"
        ? `image: ${asset.path}\nalt: ${asset.description || asset.path}`
        : `@${asset.path}`;
    await navigator.clipboard?.writeText(snippet).catch(() => undefined);
    setTaskStatus(`Copied reference for ${asset.path}.`);
  }

  async function runTaskAction(label: string, action: () => Promise<void>) {
    setIsBusy(true);
    setTaskError("");
    setTaskStatus(`${label}...`);
    try {
      await action();
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : String(error));
      setTaskStatus(`${label} failed.`);
    } finally {
      setIsBusy(false);
    }
  }

  function applyTaskPayload(payload: TaskFolderPayload) {
    setTask(payload);
    const nextDeck = payload.deck
      ? normalizeTaskDeck(payload.deck, payload)
      : createEmptyTaskDeck(payload);
    applyDeck(nextDeck, true);
  }

  function applyDeck(nextDeck: DeckSpec, syncYaml: boolean, selectedId?: string) {
    setDeck(nextDeck);
    setSelectedSlideId(selectedId ?? nextDeck.slides[0]?.id ?? "");
    setDeckYamlError("");
    if (syncYaml) {
      setDeckYamlText(deckToYaml(nextDeck));
    }
  }

  function updateDeckYaml(value: string) {
    setDeckYamlText(value);
    try {
      const parsedDeck = parseDeckYaml(value, task);
      setDeck(parsedDeck);
      setDeckYamlError("");
      setSelectedSlideId((currentSlideId) =>
        parsedDeck.slides.some((slide) => slide.id === currentSlideId)
          ? currentSlideId
          : parsedDeck.slides[0]?.id ?? "",
      );
    } catch (error) {
      setDeckYamlError(error instanceof Error ? error.message : String(error));
    }
  }

  async function openTaskPayload(payload: TaskFolderPayload, showWorkbenchWindow: boolean) {
    applyTaskPayload(payload);
    await refreshVault();
    if (showWorkbenchWindow) {
      await window.slideforge?.showWorkbenchWindow();
    }
  }

  async function hydrateInitialTask() {
    if (!isDesktopRuntime()) {
      return;
    }
    try {
      const payload = await invokeDesktop<TaskFolderPayload | null>("get_initial_task");
      if (payload) {
        applyTaskPayload(payload);
      }
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : String(error));
    }
  }

  function returnToWelcome() {
    setTask(null);
    setDeck(initialDeck);
    setDeckYamlText(deckToYaml(initialDeck));
    setDeckYamlError("");
    setSelectedSlideId(initialDeck.slides[0]?.id ?? "");
    setTaskError("");
    setTaskStatus("No project opened.");
    void window.slideforge?.showWelcomeWindow();
  }

  if (!task) {
    return (
      <WelcomeScreen
        createProject={createProject}
        isBusy={isBusy}
        newProjectName={newProjectName}
        openTaskFolder={openTaskFolder}
        openVaultProject={openVaultProject}
        setNewProjectName={setNewProjectName}
        status={taskError || taskStatus}
        statusTone={taskError ? "warn" : "normal"}
        vaultProjects={vaultProjects}
        windowAction={(action) => window.slideforge?.windowAction(action)}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Slideforge</p>
          <h1>演示稿工作台</h1>
        </div>
        <div className="topbar-actions" aria-label="Deck actions">
          <Button type="button" onClick={openActivePreview} variant="secondary">
            <PanelsTopLeftIcon />
            Open Slide Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setTaskStatus(
                validation.length === 0
                  ? "Local validation passed."
                  : `Local validation found ${validation.length} issue(s).`,
              )
            }
          >
            <BadgeCheckIcon />
            Check YAML
          </Button>
          <Button type="button" variant="outline" onClick={saveDeck} disabled={isBusy || !task}>
            <SaveIcon />
            Save deck.yaml
          </Button>
        </div>
      </header>

      <Tabs defaultValue="slides" className="workbench-tabs">
        <div className="workbench-tabbar">
          <TabsList>
            <TabsTrigger value="project">
              <FolderOpenIcon />
              Project
            </TabsTrigger>
            <TabsTrigger value="slides">
              <PresentationIcon />
              Slides
            </TabsTrigger>
            <TabsTrigger value="export">
              <DownloadIcon />
              Export
            </TabsTrigger>
          </TabsList>
          <p className={taskError ? "task-status warn" : "task-status"}>
            {taskError || taskStatus}
          </p>
        </div>

        <TabsContent value="project" className="workbench-tab project-page">
          <Card className="task-panel" aria-label="Task folder">
            <div className="task-summary">
              <div>
                <p className="task-kicker">Project</p>
                <h2>{task.name}</h2>
                <p>{task.path}</p>
              </div>
              <div className="task-actions">
                <Button type="button" variant="outline" onClick={openTaskFolder} disabled={isBusy}>
                  <FolderOpenIcon />
                  Switch Project
                </Button>
                <Button type="button" variant="outline" onClick={returnToWelcome} disabled={isBusy}>
                  <FolderOpenIcon />
                  Projects
                </Button>
                <Button type="button" variant="outline" onClick={reloadTaskFolder} disabled={isBusy || !task}>
                  <RefreshCwIcon />
                  Reload
                </Button>
                <Button type="button" variant="outline" onClick={saveDeck} disabled={isBusy || !task}>
                  <SaveIcon />
                  Save deck.yaml
                </Button>
                <Button
                  type="button"
                  onClick={draftDeckWithAi}
                  disabled={isBusy || !task || !task.envStatus.hasKey || !task.envStatus.hasModel}
                  variant={task.envStatus.hasKey && task.envStatus.hasModel ? "default" : "secondary"}
                >
                  <WandSparklesIcon />
                  Draft with AI
                </Button>
              </div>
            </div>
            <div className="template-strip" aria-label="Template settings">
              <div>
                <FieldLabel>Template</FieldLabel>
                <Select value={currentTemplate} onValueChange={(value) => updateTemplate(value as TemplateId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templatePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Theme</FieldLabel>
                <Select value={deck.meta.theme} onValueChange={(value) => updateTheme(value as ThemeId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p>
                {deck.slides.length} slides · {deck.assets?.length ?? 0} assets
              </p>
            </div>
            <div className="task-grid">
              <TaskMetric icon={<FileTextIcon />} label="Brief" value={`${wordCount(task.brief)} chars`} />
              <TaskMetric icon={<FileTextIcon />} label="Outline" value={`${wordCount(task.outline)} chars`} />
              <TaskMetric icon={<ImageIcon />} label="Assets" value={`${task.assets.length} files`} />
              <TaskMetric
                icon={<BadgeCheckIcon />}
                label="OpenAI"
                value={task.envStatus.message}
                tone={task.envStatus.hasKey && task.envStatus.hasModel ? "ok" : "warn"}
              />
            </div>
          </Card>

          <section className="project-grid" aria-label="Project inputs">
            <Card className="project-document">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Brief</CardTitle>
                  <CardDescription>brief.md</CardDescription>
                </div>
                <Badge variant="outline">{wordCount(task.brief)} chars</Badge>
              </CardHeader>
              <ScrollArea className="project-document-body">
                <pre>{task.brief || "brief.md is empty."}</pre>
              </ScrollArea>
            </Card>

            <Card className="project-document">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Outline</CardTitle>
                  <CardDescription>outline.md</CardDescription>
                </div>
                <Badge variant="outline">{wordCount(task.outline)} chars</Badge>
              </CardHeader>
              <ScrollArea className="project-document-body">
                <pre>{task.outline || "outline.md is empty."}</pre>
              </ScrollArea>
            </Card>

            <Card
              className="project-document assets-document"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleAssetDrop}
            >
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Assets</CardTitle>
                  <CardDescription>Drop files here or import into assets/</CardDescription>
                </div>
                <div className="pane-heading-actions">
                  <Badge variant="outline">{task.assets.length} files</Badge>
                  <Button type="button" variant="outline" onClick={() => void importAssets()} disabled={isBusy}>
                    <UploadIcon />
                    Import Assets
                  </Button>
                </div>
              </CardHeader>
              <ScrollArea className="project-document-body">
                <div className="asset-list">
                  {task.assets.length === 0 ? <p>No assets yet.</p> : null}
                  {task.assets.map((asset) => (
                    <div key={asset.id}>
                      <strong>{asset.path}</strong>
                      <span>{asset.kind}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void copyAssetReference(asset)}
                      >
                        <CopyIcon />
                        Copy Ref
                      </Button>
                      {asset.kind === "image" ? (
                        <Button type="button" variant="outline" onClick={() => attachVisualAsset(asset)}>
                          <ClipboardPlusIcon />
                          Use on Slide
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="task-assets">
                <span>Referenced</span>
                {task.referencedAssets.length === 0 ? (
                  <Badge variant="outline">none</Badge>
                ) : (
                  task.referencedAssets.map((asset) => (
                    <Badge key={asset.assetId} variant="outline">
                      {asset.path}
                    </Badge>
                  ))
                )}
                {task.missingAssetRefs.map((assetRef) => (
                  <Badge key={assetRef} variant="destructive">
                    missing {assetRef}
                  </Badge>
                ))}
              </div>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="slides" className="workbench-tab slides-page">
          <section className="workspace" aria-label="Deck workspace">
            <Card className="outline-pane">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Outline</CardTitle>
                  <CardDescription>
                    {deck.slides.length} slide{deck.slides.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="slide-actions">
                <Select value={layoutToAdd} onValueChange={(value) => setLayoutToAdd(value as LayoutId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateLayouts.map((layoutId) => (
                      <SelectItem key={layoutId} value={layoutId}>
                        {layoutLabel(layoutId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addSlide}>
                  <FilePlus2Icon />
                  Add Slide
                </Button>
                <Button type="button" variant="outline" onClick={duplicateSlide} disabled={!selectedSlide}>
                  <CopyIcon />
                  Duplicate
                </Button>
                <Button type="button" variant="outline" onClick={deleteSlide} disabled={deck.slides.length <= 1}>
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
              <CardContent className="pane-content">
                <ScrollArea className="slide-scroll">
                  <nav className="slide-list" aria-label="Slides">
                    {deck.slides.map((slide, index) => (
                      <button
                        className={slide.id === selectedSlide.id ? "active" : ""}
                        key={slide.id}
                        onClick={() => setSelectedSlideId(slide.id)}
                        type="button"
                      >
                        <span className="slide-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{slide.title}</strong>
                        <Badge variant="outline">{slideLayoutId(slide)}</Badge>
                      </button>
                    ))}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="yaml-editor-pane" aria-label="Deck YAML editor">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>deck.yaml</CardTitle>
                  <CardDescription>
                    {deck.meta.title} · {deck.meta.template ?? "teaching"} · {deck.meta.theme}
                  </CardDescription>
                </div>
                <Badge variant={deckYamlError ? "destructive" : "secondary"}>
                  {deckYamlError ? "invalid YAML" : "parsed"}
                </Badge>
              </CardHeader>
              <div className="yaml-editor-toolbar">
                <span>{deck.slides.length} slides</span>
                <span>{deck.assets?.length ?? 0} assets</span>
                <span>{deckYamlText.length} chars</span>
              </div>
              <Textarea
                className="yaml-editor"
                spellCheck={false}
                value={deckYamlText}
                onChange={(event) => updateDeckYaml(event.target.value)}
              />
            </Card>

            <Card className="inspect-pane">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Inspect</CardTitle>
                  <CardDescription>Preview and structure</CardDescription>
                </div>
                <Badge variant={validation.length === 0 ? "secondary" : "destructive"}>
                  {validation.length === 0 ? "valid" : `${validation.length} issues`}
                </Badge>
              </CardHeader>

              <Tabs defaultValue="preview" className="inspect-tabs">
                <TabsList className="mx-3 mt-3 grid grid-cols-3">
                  <TabsTrigger value="preview">
                    <EyeIcon />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="checks">Checks</TabsTrigger>
                  <TabsTrigger value="spec">Spec</TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                  <SlidePreview assets={deck.assets ?? []} projectPath={task.path} slide={selectedSlide} />
                </TabsContent>
                <TabsContent value="checks">
                  <section className="issues">
                    {validation.length === 0 ? (
                      <p>No blocking issues.</p>
                    ) : (
                      <ul>
                        {validation.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    {task?.missingAssetRefs.length ? (
                      <>
                        <h3>Missing assets</h3>
                        <ul>
                          {task.missingAssetRefs.map((assetRef) => (
                            <li key={assetRef}>{assetRef}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </section>
                </TabsContent>
                <TabsContent value="spec" className="spec-tab">
                  <section className="spec-preview">
                    <pre>{JSON.stringify(selectedSlide, null, 2)}</pre>
                  </section>
                </TabsContent>
              </Tabs>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="export" className="workbench-tab export-page">
          <section className="export-grid" aria-label="Deck export">
            <Card className="export-panel">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Preview Deck</CardTitle>
                  <CardDescription>Full Slidev renderer</CardDescription>
                </div>
                <Badge variant={deckYamlError ? "destructive" : "secondary"}>
                  {deckYamlError ? "fix YAML first" : "ready"}
                </Badge>
              </CardHeader>
              <CardContent className="export-actions">
                <Button type="button" onClick={previewDeck} disabled={isBusy || Boolean(deckYamlError)}>
                  <PresentationIcon />
                  Preview Deck
                </Button>
                <p>{task.path}/output/slidev</p>
              </CardContent>
            </Card>

            <Card className="export-panel">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Export PDF</CardTitle>
                  <CardDescription>output/slides.pdf</CardDescription>
                </div>
                <Badge variant="outline">output/</Badge>
              </CardHeader>
              <CardContent className="export-actions">
                <Button type="button" variant="outline" onClick={exportPdf} disabled={isBusy || Boolean(deckYamlError)}>
                  <DownloadIcon />
                  Export PDF
                </Button>
                <p>{task.path}/output/slides.pdf</p>
              </CardContent>
            </Card>

            <Card className="export-panel export-status">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Build Status</CardTitle>
                  <CardDescription>{task.name}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="export-actions">
                <pre>{taskError || taskStatus}</pre>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function WelcomeScreen({
  createProject,
  isBusy,
  newProjectName,
  openTaskFolder,
  openVaultProject,
  setNewProjectName,
  status,
  statusTone,
  vaultProjects,
  windowAction,
}: {
  createProject: () => Promise<void>;
  isBusy: boolean;
  newProjectName: string;
  openTaskFolder: () => Promise<void>;
  openVaultProject: (project: VaultProject) => Promise<void>;
  setNewProjectName: (value: string) => void;
  status: string;
  statusTone: "normal" | "warn";
  vaultProjects: VaultProject[];
  windowAction: (action: "close" | "minimize") => Promise<void> | undefined;
}) {
  const availableProjects = vaultProjects.filter((project) => project.exists);
  const missingProjects = vaultProjects.filter((project) => !project.exists);

  return (
    <main className="welcome-shell">
      <div className="welcome-window-controls" aria-label="Window controls">
        <button
          aria-label="Close"
          className="close"
          onClick={() => void windowAction("close")}
          type="button"
        />
        <button
          aria-label="Minimize"
          className="minimize"
          onClick={() => void windowAction("minimize")}
          type="button"
        />
      </div>
      <section className="welcome-sidebar" aria-label="Project start">
        <div>
          <p className="eyebrow">Slideforge</p>
          <h1>Start a deck project</h1>
          <p className="welcome-copy">
            Create a project folder for brief.md, outline.md, deck.yaml, assets and output.
          </p>
        </div>

        <div className="welcome-actions">
          <div className="field">
            <FieldLabel>New project name</FieldLabel>
            <Input
              autoFocus
              placeholder="Graph DFS lesson"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void createProject();
                }
              }}
            />
          </div>
          <Button type="button" onClick={createProject} disabled={isBusy}>
            <FolderOpenIcon />
            Create Project
          </Button>
          <Button type="button" variant="outline" onClick={openTaskFolder} disabled={isBusy}>
            <FolderOpenIcon />
            Open Project
          </Button>
        </div>

        <p className={statusTone === "warn" ? "welcome-status warn" : "welcome-status"}>
          {status}
        </p>
      </section>

      <section className="welcome-main" aria-label="Recent projects">
        <div className="welcome-main-heading">
          <div>
            <h2>Recent Projects</h2>
            <p>{vaultProjects.length} project{vaultProjects.length === 1 ? "" : "s"} in this workspace</p>
          </div>
          <Button type="button" variant="secondary" onClick={openTaskFolder} disabled={isBusy}>
            <FolderOpenIcon />
            Browse
          </Button>
        </div>

        <ScrollArea className="welcome-recents">
          {availableProjects.length === 0 ? (
            <section className="welcome-empty">
              <h3>No projects yet</h3>
              <p>Create a project folder or open an existing Slideforge task folder.</p>
            </section>
          ) : (
            <div className="welcome-project-list">
              {availableProjects.map((project) => (
                <button
                  disabled={isBusy}
                  key={project.path}
                  onClick={() => void openVaultProject(project)}
                  type="button"
                >
                  <strong>{project.name}</strong>
                  <span>{project.path}</span>
                  <small>Last opened {project.lastOpenedAt}</small>
                </button>
              ))}
            </div>
          )}

          {missingProjects.length > 0 ? (
            <section className="welcome-missing">
              <h3>Missing folders</h3>
              {missingProjects.map((project) => (
                <div key={project.path}>
                  <strong>{project.name}</strong>
                  <span>{project.path}</span>
                </div>
              ))}
            </section>
          ) : null}
        </ScrollArea>
      </section>
    </main>
  );
}

function ActiveSlidePreviewApp() {
  const [slide, setSlide] = useState<DeckSlide | null>(null);

  useEffect(() => {
    if (!window.slideforge) {
      return undefined;
    }

    const unsubscribe = window.slideforge.onActiveSlideUpdated(setSlide);
    void window.slideforge.activePreviewReady();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <main className="active-preview-shell">
      {slide ? (
        <SlidePreviewStage slide={slide} />
      ) : (
        <section className="active-preview-empty">
          <h1>Slide Preview</h1>
          <p>Select a slide in the main window.</p>
        </section>
      )}
    </main>
  );
}

function TaskMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className={`task-metric ${tone ?? ""}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SlidePreview({
  assets,
  projectPath,
  slide,
}: {
  assets: DeckAsset[];
  projectPath?: string;
  slide: DeckSlide;
}) {
  const imagePath = typeof slideProps(slide).image === "string" ? String(slideProps(slide).image) : "";
  const visualAsset =
    assets.find((asset) => asset.path === imagePath) ??
    assets.find((asset) => asset.id === slide.visual?.assetId);
  return (
    <section className="slide-preview">
      <span>{slideLayoutId(slide)}</span>
      <h3>{slide.title}</h3>
      {visualAsset ? <VisualPreview asset={visualAsset} projectPath={projectPath} slide={slide} /> : null}
      <PreviewBody slide={slide} />
    </section>
  );
}

function VisualPreview({
  asset,
  projectPath,
  slide,
}: {
  asset: DeckAsset;
  projectPath?: string;
  slide: DeckSlide;
}) {
  if (asset.kind === "image" && projectPath) {
    return (
      <figure className="preview-visual">
        <img src={assetFileUrl(projectPath, asset.path)} alt={slide.visual?.alt || asset.path} />
        <figcaption>
          {asset.path}
          {slide.visual?.alt ? ` (${slide.visual.alt})` : ""}
        </figcaption>
      </figure>
    );
  }

  return (
    <p className="preview-visual">
      Visual: {asset.path}
      {slide.visual?.alt ? ` (${slide.visual.alt})` : ""}
    </p>
  );
}

function PreviewBody({ slide }: { slide: DeckSlide }) {
  const props = slideProps(slide);
  const layout = slideLayoutId(slide);
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return (
      <div className="preview-metrics">
        {[...arrayValue(props, "done"), ...arrayValue(props, "doing")].slice(0, 3).map((metric, index) => (
          <div key={index}>
            <small>{objectString(metric, "label")}</small>
            <strong>{objectString(metric, "value")}%</strong>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "system-flow" || layout === "research-system-concept") {
    return <p>{arrayValue(props, "steps").length} flow steps</p>;
  }

  if (layout === "code-walkthrough") {
    return <pre>{stringValue(props, "code").slice(0, 240)}</pre>;
  }

  if (layout === "exercise-checklist") {
    return <p>{arrayValue(props, "items").length} checklist items</p>;
  }

  if (layout === "two-column") {
    return <p>{arrayValue(props, "columns").length} columns</p>;
  }

  return <p>{firstContentText(props) || "No props fields."}</p>;
}

function validateDeck(deck: DeckSpec): string[] {
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
  deck.slides.forEach((slide, index) => {
    if (!slide.title.trim()) {
      issues.push(`Slide ${index + 1} needs a title.`);
    }
    if (!slide.id.trim()) {
      issues.push(`Slide ${index + 1} needs an id.`);
    }
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

function createEmptyTaskDeck(task: TaskFolderPayload): DeckSpec {
  const title = task.name.replace(/[-_]/g, " ");
  return {
    meta: {
      title: title || "Untitled teaching deck",
      language: "zh-CN",
      theme: "lecture-light",
      template: "teaching",
    },
    assets: task.assets,
    slides: [
      {
        id: "cover",
        layout: "title-cover",
        title: title || "Untitled teaching deck",
        props: {
          subtitle: "Edit deck.yaml directly or use Draft with AI from the Project tab.",
        },
      },
    ],
  };
}

function normalizeTaskDeck(deck: DeckSpec, task: TaskFolderPayload): DeckSpec {
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

function mergeDeckAssets(deckAssets: DeckAsset[], scannedAssets: DeckAsset[]): DeckAsset[] {
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

function normalizeSlideForLayout(slide: DeckSlide): DeckSlide {
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

function createDefaultSlide(layout: LayoutId, deck: DeckSpec): DeckSlide {
  const definition = layoutDefinition(layout);
  const title = definition.name;
  const id = uniqueSlideId(layout, deck);
  return {
    id,
    layout,
    title,
    props: structuredClone(definition.defaultProps),
  };
}

function defaultLayoutForSlideType(type: SlideType | undefined): LayoutId {
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

function legacySlideProps(slide: DeckSlide): Record<string, unknown> {
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
          Array.isArray(row) ? row.map((cell) => String(cell ?? "")).join(" / ") : String(row ?? ""),
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
          [objectString(metric, "label"), objectString(metric, "value"), objectString(metric, "note")]
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

function slideProps(slide: DeckSlide): Record<string, unknown> {
  return slide.props ?? legacySlideProps(slide);
}

function slideLayoutId(slide: DeckSlide): LayoutId | string {
  return slide.layout ?? defaultLayoutForSlideType(slide.type);
}

function layoutDefinition(layoutId: LayoutId | string): LayoutDefinition {
  return (
    layoutDefinitions.find((layout) => layout.id === layoutId) ??
    layoutDefinitions.find((layout) => layout.id === "bullet-list")!
  );
}

function layoutLabel(layoutId: LayoutId | string): string {
  return layoutDefinition(layoutId).name;
}

function uniqueSlideId(base: string, deck: DeckSpec): string {
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

function deckToYaml(deck: DeckSpec): string {
  return yaml.dump(deck, {
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
  });
}

function parseDeckYaml(value: string, task: TaskFolderPayload | null): DeckSpec {
  const parsed = yaml.load(value);
  const deck = coerceDeckSpec(parsed);
  return task ? normalizeTaskDeck(deck, task) : deck;
}

function coerceDeckSpec(value: unknown): DeckSpec {
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

function wordCount(value: string): number {
  return value.trim().length;
}

function isDesktopRuntime(): boolean {
  return Boolean(window.slideforge);
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime()) {
    throw new Error("This project action is only available in the desktop window.");
  }
  return window.slideforge!.invoke<T>(command, args);
}

function stringValue(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function arrayValue(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

function objectString(source: unknown, key: string): string {
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return "";
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function assetFileUrl(projectPath: string, assetPath: string): string {
  const absolutePath = `${projectPath.replace(/\/+$/g, "")}/${assetPath}`;
  return `file://${absolutePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function firstContentText(content: Record<string, unknown>): string {
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

function writePreviewWindow(target: Window, slide: DeckSlide) {
  target.document.open();
  target.document.write(renderPreviewDocument(slide));
  target.document.close();
}

async function openDesktopActivePreview(slide: DeckSlide): Promise<boolean> {
  return window.slideforge?.openActivePreview(slide).catch(() => false) ?? false;
}

async function emitActiveSlideToDesktopPreview(slide: DeckSlide): Promise<void> {
  if (!window.slideforge) {
    return;
  }
  await window.slideforge.updateActivePreview(slide).catch(() => undefined);
}

function SlidePreviewStage({ slide }: { slide: DeckSlide }) {
  const layout = slideLayoutId(slide);
  return (
    <section className={`active-slide-stage ${layout}`}>
      <p className="active-slide-type">{layout}</p>
      <h1>{slide.title}</h1>
      <ActivePreviewBody slide={slide} />
    </section>
  );
}

function ActivePreviewBody({ slide }: { slide: DeckSlide }) {
  const layout = slideLayoutId(slide);
  const props = slideProps(slide);
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return (
      <div className="active-metric-grid">
        {[...arrayValue(props, "done"), ...arrayValue(props, "doing")].slice(0, 6).map((metric, index) => (
          <article key={index}>
            <span>{objectString(metric, "label")}</span>
            <strong>{objectString(metric, "value")}%</strong>
          </article>
        ))}
      </div>
    );
  }

  if (layout === "quote-callout") {
    return (
      <p className="active-note">
        {stringValue(props, "quote") || stringValue(props, "statement") || stringValue(props, "body")}
      </p>
    );
  }

  if (layout === "code-walkthrough") {
    return (
      <>
        <pre>
          <code>{stringValue(props, "code")}</code>
        </pre>
        {stringValue(props, "note") ? (
          <p className="active-note">{stringValue(props, "note")}</p>
        ) : null}
      </>
    );
  }

  if (layout === "system-flow" || layout === "research-system-concept") {
    return (
      <div className="active-workflow-list">
        {arrayValue(props, "steps").map((step, index) => (
          <article key={index}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{String(step)}</span>
          </article>
        ))}
      </div>
    );
  }

  if (layout === "exercise-checklist") {
    return <ActiveList items={arrayValue(props, "items")} />;
  }

  if (layout === "bullet-list") {
    return <ActiveList items={arrayValue(props, "points").length ? arrayValue(props, "points") : arrayValue(props, "items")} />;
  }

  if (layout === "two-column") {
    return (
      <div className="active-columns">
        {arrayValue(props, "columns").map((column, index) => (
          <article key={index}>
            <h2>{objectString(column, "title")}</h2>
            <ActiveList items={arrayValue(column as Record<string, unknown>, "items")} />
          </article>
        ))}
      </div>
    );
  }

  if (layout === "title-cover" || layout === "section-divider") {
    return <p className="active-cover-subtitle">{stringValue(props, "subtitle") || stringValue(props, "lead")}</p>;
  }

  return null;
}

function ActiveList({ items }: { items: unknown[] }) {
  return (
    <ul className="active-list">
      {items.map((item, index) => (
        <li key={index}>{String(item)}</li>
      ))}
    </ul>
  );
}

function renderPreviewDocument(slide: DeckSlide): string {
  const layout = slideLayoutId(slide);
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(slide.title)} - Slideforge Preview</title>`,
    "<style>",
    renderPreviewWindowCss(),
    "</style>",
    "</head>",
    "<body>",
    '<main class="preview-stage">',
    `<section class="slide ${escapeHtml(layout)}">`,
    `<p class="slide-type">${escapeHtml(layout)}</p>`,
    `<h1>${escapeHtml(slide.title)}</h1>`,
    renderPreviewWindowBody(slide),
    "</section>",
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderPreviewWindowBody(slide: DeckSlide): string {
  const layout = slideLayoutId(slide);
  const props = slideProps(slide);
  if (layout === "title-cover") {
    return `<p class="cover-subtitle">${escapeHtml(stringValue(props, "subtitle"))}</p>`;
  }
  if (layout === "quote-callout") {
    return `<p class="note">${escapeHtml(stringValue(props, "quote") || stringValue(props, "statement") || stringValue(props, "body"))}</p>`;
  }
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return [
      '<div class="metric-grid">',
      ...[...arrayValue(props, "done"), ...arrayValue(props, "doing")].slice(0, 6).map(
        (metric) =>
          `<article><span>${escapeHtml(objectString(metric, "label"))}</span><strong>${escapeHtml(objectString(metric, "value"))}%</strong></article>`,
      ),
      "</div>",
    ].join("\n");
  }
  if (layout === "code-walkthrough") {
    return [
      `<pre><code>${escapeHtml(stringValue(props, "code"))}</code></pre>`,
      stringValue(props, "note") ? `<p class="note">${escapeHtml(stringValue(props, "note"))}</p>` : "",
    ].join("\n");
  }
  if (layout === "system-flow" || layout === "research-system-concept") {
    return [
      '<div class="workflow-list">',
      ...arrayValue(props, "steps").map(
        (step, index) =>
          `<article><strong>${String(index + 1).padStart(2, "0")}</strong><span>${escapeHtml(String(step))}</span></article>`,
      ),
      "</div>",
    ].join("\n");
  }
  if (layout === "exercise-checklist") {
    return renderPreviewList(props, "items");
  }
  if (layout === "two-column") {
    return [
      '<div class="columns">',
      ...arrayValue(props, "columns").map(
        (column) =>
          `<article><h2>${escapeHtml(objectString(column, "title"))}</h2><ul>${arrayValue(column as Record<string, unknown>, "items")
            .map((item) => `<li>${escapeHtml(String(item))}</li>`)
            .join("")}</ul></article>`,
      ),
      "</div>",
    ].join("\n");
  }
  return renderPreviewList(props, "points");
}

function renderPreviewList(content: Record<string, unknown>, key: string): string {
  return [
    '<ul class="checklist">',
    ...arrayValue(content, key).map((item) => `<li>${escapeHtml(String(item))}</li>`),
    "</ul>",
  ].join("\n");
}

function renderPreviewWindowCss(): string {
  return `
    :root {
      color: #18202a;
      background: #eef2f4;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .preview-stage {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 24px;
    }
    .slide {
      width: min(1120px, 100%);
      aspect-ratio: 16 / 9;
      overflow: auto;
      border: 1px solid #d7dde3;
      border-radius: 8px;
      background: #fff;
      padding: 48px 56px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
    }
    .slide-type {
      margin: 0 0 10px;
      color: #0f766e;
      font-size: 13px;
      font-weight: 750;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 28px;
      font-size: 42px;
      line-height: 1.12;
      letter-spacing: 0;
    }
    h2 {
      margin: 0 0 10px;
      color: #0f766e;
      font-size: 22px;
      letter-spacing: 0;
    }
    p, li, td, small, span {
      color: #5e6a75;
      line-height: 1.55;
    }
    .cover, .closing {
      display: grid;
      place-content: center;
      text-align: center;
    }
    .cover h1, .closing h1 {
      margin-bottom: 14px;
      font-size: 56px;
    }
    .cover-subtitle {
      margin: 0;
      font-size: 24px;
    }
    .metric-grid, .columns {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }
    .columns {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    article {
      border: 1px solid #d7dde3;
      border-radius: 8px;
      background: #fff;
      padding: 18px;
    }
    .metric-grid article {
      display: grid;
      min-height: 128px;
      gap: 6px;
    }
    .metric-grid strong {
      align-self: center;
      color: #b42318;
      font-size: 34px;
      line-height: 1;
    }
    .card-stack, .workflow-list {
      display: grid;
      gap: 14px;
    }
    .workflow-list article {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 20px;
      border-left: 5px solid #0f766e;
      background: #f6f8fa;
    }
    pre {
      overflow: auto;
      border: 1px solid #d7dde3;
      border-radius: 8px;
      background: #f6f8fa;
      padding: 18px;
      font-size: 18px;
      line-height: 1.45;
    }
    .note {
      margin-top: 18px;
      border-left: 5px solid #0f766e;
      padding-left: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
    }
    th, td {
      border: 1px solid #d7dde3;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #18202a;
      background: #f6f8fa;
    }
    .checklist {
      display: grid;
      gap: 14px;
      margin: 0;
      padding-left: 22px;
      font-size: 22px;
    }
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

window.__slideforgeRoot ??= ReactDOM.createRoot(rootElement);

window.__slideforgeRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
