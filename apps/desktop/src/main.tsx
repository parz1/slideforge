import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";
import yaml from "js-yaml";
import {
  BadgeCheckIcon,
  EyeIcon,
  FileTextIcon,
  FolderOpenIcon,
  HammerIcon,
  ImageIcon,
  PanelsTopLeftIcon,
  PresentationIcon,
  RefreshCwIcon,
  SaveIcon,
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

interface DeckSpec {
  meta: {
    title: string;
    language: string;
    theme: string;
    template?: "teaching";
  };
  assets?: DeckAsset[];
  slides: DeckSlide[];
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
  type: SlideType;
  title: string;
  content: Record<string, unknown>;
  visual?: VisualRef;
  speakerNotes?: string;
  animation?: {
    preset?: "none" | "step_reveal" | "highlight_key_points";
  };
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

const initialDeck: DeckSpec = {
  meta: {
    title: "Graph DFS and Postfix Notation",
    language: "zh-CN",
    theme: "teaching",
    template: "teaching",
  },
  slides: [
    {
      id: "cover",
      type: "cover",
      title: "图的深度优先探索与后缀记法",
      content: {
        subtitle: "面向试讲的解题课设计",
      },
      speakerNotes:
        "开场：今天不是讲背答案，而是讲如何从程序行为推回算法结构。",
    },
    {
      id: "goals",
      type: "metric_grid",
      title: "这节课要解决什么",
      content: {
        metrics: [
          { label: "题型 1", value: "DFS", note: "读 Python 递归程序" },
          { label: "题型 2", value: "Stack", note: "后缀记法求值" },
          { label: "核心能力", value: "Trace", note: "手动追踪状态变化" },
        ],
      },
    },
    {
      id: "lesson-thread",
      type: "principle_card",
      title: "讲课主线",
      content: {
        cards: [
          {
            title: "会追踪状态，就能读懂程序",
            body: "把每一步的状态写出来：当前顶点、visited、forest、栈。",
          },
        ],
      },
    },
    {
      id: "problem-breakdown",
      type: "two_column",
      title: "题目拆解",
      content: {
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
      type: "code_explain",
      title: "DFS：先看数据结构",
      content: {
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
      type: "trace_table",
      title: "手动追踪 forest",
      content: {
        columns: ["Step", "Outer loop", "Action", "forest"],
        rows: [
          ["1", "n = A", "call DFS", "[{A,B,C,D,E,F}]"],
          ["2", "n = G", "call DFS", "[{A,B,C,D,E,F}, {G,H}]"],
        ],
      },
    },
    {
      id: "practice",
      type: "checklist",
      title: "课堂练习",
      content: {
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
  const previewWindow = useRef<Window | null>(null);

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

  async function generateDeck() {
    if (!task) {
      setTaskError("Open a task folder before generating.");
      return;
    }
    await runTaskAction("Generate deck", async () => {
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
          ? "Generated deck after one repair pass. Review before saving."
          : "Generated deck. Review before saving.",
      );
    });
  }

  async function buildDeck() {
    if (!task) {
      setTaskError("Open a task folder before building output.");
      return;
    }
    if (deckYamlError) {
      setTaskError("Fix deck.yaml before building output.");
      return;
    }
    await runTaskAction("Build deck", async () => {
      const result = await invokeDesktop<BuildDeckResult>("build_task_deck", {
        path: task.path,
        deck,
      });
      const pdf = result.pdfPath ? ` PDF: ${result.pdfPath}` : "";
      const warning = result.warnings.length > 0 ? ` ${result.warnings[0]}` : "";
      setTaskStatus(`Built Slidev: ${result.slidevDir}.${pdf}${warning}`);
    });
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

  function applyDeck(nextDeck: DeckSpec, syncYaml: boolean) {
    setDeck(nextDeck);
    setSelectedSlideId(nextDeck.slides[0]?.id ?? "");
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
            Active Preview
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
            Validate
          </Button>
          <Button type="button" variant="outline" onClick={buildDeck} disabled={isBusy}>
            <HammerIcon />
            Build
          </Button>
          <Button type="button" onClick={() => window.open("http://localhost:3030/", "_blank")}>
            <PresentationIcon />
            Preview
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
                <Button type="button" onClick={generateDeck} disabled={isBusy || !task}>
                  <WandSparklesIcon />
                  Generate
                </Button>
              </div>
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

            <Card className="project-document assets-document">
              <CardHeader className="pane-heading">
                <div>
                  <CardTitle>Assets</CardTitle>
                  <CardDescription>assets/ and referenced files</CardDescription>
                </div>
                <Badge variant="outline">{task.assets.length} files</Badge>
              </CardHeader>
              <ScrollArea className="project-document-body">
                <div className="asset-list">
                  {task.assets.length === 0 ? <p>No assets yet.</p> : null}
                  {task.assets.map((asset) => (
                    <div key={asset.id}>
                      <strong>{asset.path}</strong>
                      <span>{asset.kind}</span>
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
                        <Badge variant="outline">{slide.type}</Badge>
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
                  <SlidePreview assets={deck.assets ?? []} slide={selectedSlide} />
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
          <h1>Start a teaching deck project</h1>
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
          <h1>Active Preview</h1>
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

function SlidePreview({ assets, slide }: { assets: DeckAsset[]; slide: DeckSlide }) {
  const visualAsset = assets.find((asset) => asset.id === slide.visual?.assetId);
  return (
    <section className="slide-preview">
      <span>{slide.type}</span>
      <h3>{slide.title}</h3>
      {visualAsset ? (
        <p className="preview-visual">
          Visual: {visualAsset.path}
          {slide.visual?.alt ? ` (${slide.visual.alt})` : ""}
        </p>
      ) : null}
      <PreviewBody slide={slide} />
    </section>
  );
}

function PreviewBody({ slide }: { slide: DeckSlide }) {
  if (slide.type === "metric_grid") {
    return (
      <div className="preview-metrics">
        {arrayValue(slide.content, "metrics").map((metric, index) => (
          <div key={index}>
            <small>{objectString(metric, "label")}</small>
            <strong>{objectString(metric, "value")}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (slide.type === "trace_table") {
    return <p>{arrayValue(slide.content, "rows").length} trace rows</p>;
  }

  if (slide.type === "code_explain") {
    return <pre>{stringValue(slide.content, "code").slice(0, 240)}</pre>;
  }

  if (slide.type === "checklist") {
    return <p>{arrayValue(slide.content, "items").length} checklist items</p>;
  }

  return <p>{firstContentText(slide.content) || "No content fields."}</p>;
}

function validateDeck(deck: DeckSpec): string[] {
  const issues: string[] = [];
  if (!deck.meta.title.trim()) {
    issues.push("Deck title is required.");
  }
  if (deck.meta.template && deck.meta.template !== "teaching") {
    issues.push("Only the teaching template is supported in this MVP.");
  }
  const assetIds = new Set((deck.assets ?? []).map((asset) => asset.id));
  deck.slides.forEach((slide, index) => {
    if (!slide.title.trim()) {
      issues.push(`Slide ${index + 1} needs a title.`);
    }
    if (!slide.id.trim()) {
      issues.push(`Slide ${index + 1} needs an id.`);
    }
    if (!slideTypes.includes(slide.type)) {
      issues.push(`Slide ${index + 1} uses unsupported type "${slide.type}".`);
    }
    if (slide.visual && !assetIds.has(slide.visual.assetId)) {
      issues.push(`Slide ${index + 1} references a missing visual asset.`);
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
      theme: "teaching",
      template: "teaching",
    },
    assets: task.assets,
    slides: [
      {
        id: "cover",
        type: "cover",
        title: title || "Untitled teaching deck",
        content: {
          subtitle: "Click Generate to create the first draft from brief.md and outline.md.",
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
    },
    assets: deck.assets && deck.assets.length > 0 ? deck.assets : task.assets,
  };
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
    if (typeof candidateSlide.type !== "string") {
      throw new Error(`slides[${index}].type must be a string.`);
    }
    if (typeof candidateSlide.title !== "string") {
      throw new Error(`slides[${index}].title must be a string.`);
    }
    if (
      !candidateSlide.content ||
      typeof candidateSlide.content !== "object" ||
      Array.isArray(candidateSlide.content)
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
  return (
    <section className={`active-slide-stage ${slide.type}`}>
      <p className="active-slide-type">{slide.type}</p>
      <h1>{slide.title}</h1>
      <ActivePreviewBody slide={slide} />
    </section>
  );
}

function ActivePreviewBody({ slide }: { slide: DeckSlide }) {
  if (slide.type === "metric_grid") {
    return (
      <div className="active-metric-grid">
        {arrayValue(slide.content, "metrics").map((metric, index) => (
          <article key={index}>
            <span>{objectString(metric, "label")}</span>
            <strong>{objectString(metric, "value")}</strong>
            <small>{objectString(metric, "note")}</small>
          </article>
        ))}
      </div>
    );
  }

  if (slide.type === "principle_card") {
    return (
      <div className="active-card-stack">
        {arrayValue(slide.content, "cards").map((card, index) => (
          <article key={index}>
            <h2>{objectString(card, "title")}</h2>
            <p>{objectString(card, "body")}</p>
          </article>
        ))}
      </div>
    );
  }

  if (slide.type === "code_explain") {
    return (
      <>
        <pre>
          <code>{stringValue(slide.content, "code")}</code>
        </pre>
        {stringValue(slide.content, "note") ? (
          <p className="active-note">{stringValue(slide.content, "note")}</p>
        ) : null}
      </>
    );
  }

  if (slide.type === "trace_table") {
    return <ActiveTraceTable slide={slide} />;
  }

  if (slide.type === "workflow") {
    return (
      <div className="active-workflow-list">
        {arrayValue(slide.content, "steps").map((step, index) => (
          <article key={index}>
            <strong>{objectString(step, "label")}</strong>
            <span>{objectString(step, "body")}</span>
          </article>
        ))}
      </div>
    );
  }

  if (slide.type === "checklist") {
    return <ActiveList items={arrayValue(slide.content, "items")} />;
  }

  if (slide.type === "bullet_summary") {
    return <ActiveList items={arrayValue(slide.content, "points")} />;
  }

  if (slide.type === "process") {
    return <ActiveList items={arrayValue(slide.content, "steps")} />;
  }

  if (slide.type === "two_column" || slide.type === "comparison") {
    return (
      <div className="active-columns">
        {arrayValue(slide.content, "columns").map((column, index) => (
          <article key={index}>
            <h2>{objectString(column, "title")}</h2>
            <ActiveList items={arrayValue(column as Record<string, unknown>, "items")} />
          </article>
        ))}
      </div>
    );
  }

  if (slide.type === "note_callout") {
    return <p className="active-note">{stringValue(slide.content, "body")}</p>;
  }

  if (slide.type === "cover") {
    return <p className="active-cover-subtitle">{stringValue(slide.content, "subtitle")}</p>;
  }

  if (slide.type === "closing") {
    return <p className="active-cover-subtitle">{stringValue(slide.content, "statement")}</p>;
  }

  return null;
}

function ActiveTraceTable({ slide }: { slide: DeckSlide }) {
  const columns = arrayValue(slide.content, "columns");
  const rows = arrayValue(slide.content, "rows");
  return (
    <table className="active-trace-table">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index}>{String(column)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) =>
          Array.isArray(row) ? (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{String(cell ?? "")}</td>
              ))}
            </tr>
          ) : null,
        )}
      </tbody>
    </table>
  );
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
    `<section class="slide ${slide.type}">`,
    `<p class="slide-type">${escapeHtml(slide.type)}</p>`,
    `<h1>${escapeHtml(slide.title)}</h1>`,
    renderPreviewWindowBody(slide),
    "</section>",
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderPreviewWindowBody(slide: DeckSlide): string {
  switch (slide.type) {
    case "cover":
      return `<p class="cover-subtitle">${escapeHtml(stringValue(slide.content, "subtitle"))}</p>`;
    case "closing":
      return `<p class="cover-subtitle">${escapeHtml(stringValue(slide.content, "statement"))}</p>`;
    case "metric_grid":
      return [
        '<div class="metric-grid">',
        ...arrayValue(slide.content, "metrics").map(
          (metric) =>
            `<article><span>${escapeHtml(objectString(metric, "label"))}</span><strong>${escapeHtml(objectString(metric, "value"))}</strong><small>${escapeHtml(objectString(metric, "note"))}</small></article>`,
        ),
        "</div>",
      ].join("\n");
    case "principle_card":
      return [
        '<div class="card-stack">',
        ...arrayValue(slide.content, "cards").map(
          (card) =>
            `<article><h2>${escapeHtml(objectString(card, "title"))}</h2><p>${escapeHtml(objectString(card, "body"))}</p></article>`,
        ),
        "</div>",
      ].join("\n");
    case "code_explain":
      return [
        `<pre><code>${escapeHtml(stringValue(slide.content, "code"))}</code></pre>`,
        stringValue(slide.content, "note")
          ? `<p class="note">${escapeHtml(stringValue(slide.content, "note"))}</p>`
          : "",
      ].join("\n");
    case "trace_table":
      return renderPreviewTable(slide);
    case "workflow":
      return [
        '<div class="workflow-list">',
        ...arrayValue(slide.content, "steps").map(
          (step) =>
            `<article><strong>${escapeHtml(objectString(step, "label"))}</strong><span>${escapeHtml(objectString(step, "body"))}</span></article>`,
        ),
        "</div>",
      ].join("\n");
    case "checklist":
      return [
        '<ul class="checklist">',
        ...arrayValue(slide.content, "items").map(
          (item) => `<li>${escapeHtml(String(item))}</li>`,
        ),
        "</ul>",
      ].join("\n");
    case "two_column":
    case "comparison":
      return [
        '<div class="columns">',
        ...arrayValue(slide.content, "columns").map(
          (column) =>
            `<article><h2>${escapeHtml(objectString(column, "title"))}</h2><ul>${arrayValue(column as Record<string, unknown>, "items")
              .map((item) => `<li>${escapeHtml(String(item))}</li>`)
              .join("")}</ul></article>`,
        ),
        "</div>",
      ].join("\n");
    case "bullet_summary":
      return renderPreviewList(slide.content, "points");
    case "process":
      return renderPreviewList(slide.content, "steps");
    case "note_callout":
      return `<p class="note">${escapeHtml(stringValue(slide.content, "body"))}</p>`;
    case "section":
      return "";
  }
}

function renderPreviewList(content: Record<string, unknown>, key: string): string {
  return [
    '<ul class="checklist">',
    ...arrayValue(content, key).map((item) => `<li>${escapeHtml(String(item))}</li>`),
    "</ul>",
  ].join("\n");
}

function renderPreviewTable(slide: DeckSlide): string {
  const columns = arrayValue(slide.content, "columns");
  const rows = arrayValue(slide.content, "rows");
  return [
    "<table>",
    "<thead><tr>",
    ...columns.map((column) => `<th>${escapeHtml(String(column))}</th>`),
    "</tr></thead>",
    "<tbody>",
    ...rows.map((row) =>
      Array.isArray(row)
        ? `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ""))}</td>`).join("")}</tr>`
        : "",
    ),
    "</tbody>",
    "</table>",
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
