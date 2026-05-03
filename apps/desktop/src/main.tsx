import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";
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
  const validation = useMemo(() => validateDeck(deck), [deck]);
  const imageAssets = useMemo(
    () => (deck.assets ?? task?.assets ?? []).filter((asset) => asset.kind === "image"),
    [deck.assets, task?.assets],
  );

  useEffect(() => {
    if (previewWindow.current && !previewWindow.current.closed && selectedSlide) {
      writePreviewWindow(previewWindow.current, selectedSlide);
    }
    if (selectedSlide) {
      emitActiveSlideToDesktopPreview(selectedSlide);
    }
  }, [selectedSlide]);

  useEffect(() => {
    void refreshVault();
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

  function updateMeta<K extends keyof DeckSpec["meta"]>(
    key: K,
    value: DeckSpec["meta"][K],
  ) {
    setDeck((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [key]: value,
      },
    }));
  }

  function updateSelectedSlide(updater: (slide: DeckSlide) => DeckSlide) {
    if (!selectedSlide) {
      return;
    }
    setDeck((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === selectedSlide.id ? updater(slide) : slide,
      ),
    }));
  }

  function updateContent(key: string, value: unknown) {
    updateSelectedSlide((slide) => ({
      ...slide,
      content: {
        ...slide.content,
        [key]: value,
      },
    }));
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
      applyTaskPayload(payload);
      setNewProjectName("");
      await refreshVault();
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
      applyTaskPayload(payload);
      await refreshVault();
      setTaskStatus(`Opened ${payload.name}.`);
    });
  }

  async function openVaultProject(project: VaultProject) {
    await runTaskAction("Open vault project", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("load_task_folder", {
        path: project.path,
      });
      applyTaskPayload(payload);
      await refreshVault();
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
      setDeck(generatedDeck);
      setSelectedSlideId(generatedDeck.slides[0]?.id ?? "");
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
    setDeck(nextDeck);
    setSelectedSlideId(nextDeck.slides[0]?.id ?? "");
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

      <Card className="task-panel" aria-label="Task folder">
        <div className="task-summary">
          <div>
            <p className="task-kicker">Project</p>
            <h2>{task?.name ?? "No project"}</h2>
            <p>{task?.path ?? "Create a project or open a folder containing brief.md, outline.md, deck.yaml and assets/."}</p>
          </div>
          <div className="task-actions">
            <Input
              className="project-name-input"
              placeholder="New project name"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void createProject();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={createProject} disabled={isBusy}>
              <FolderOpenIcon />
              Create Project
            </Button>
            <Button type="button" variant="outline" onClick={openTaskFolder} disabled={isBusy}>
              <FolderOpenIcon />
              Open Project
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
          <TaskMetric icon={<FileTextIcon />} label="Brief" value={task ? `${wordCount(task.brief)} chars` : "-"} />
          <TaskMetric icon={<FileTextIcon />} label="Outline" value={task ? `${wordCount(task.outline)} chars` : "-"} />
          <TaskMetric icon={<ImageIcon />} label="Assets" value={task ? `${task.assets.length} files` : "-"} />
          <TaskMetric
            icon={<BadgeCheckIcon />}
            label="OpenAI"
            value={task?.envStatus.message ?? "Not checked"}
            tone={task?.envStatus.hasKey && task.envStatus.hasModel ? "ok" : "warn"}
          />
        </div>
        {task ? (
          <div className="task-assets">
            <span>Referenced assets</span>
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
        ) : null}
        <p className={taskError ? "task-status warn" : "task-status"}>{taskError || taskStatus}</p>
      </Card>

      <Card className="deck-meta" aria-label="Deck metadata">
        <div className="field">
          <FieldLabel>Title</FieldLabel>
          <Input
            value={deck.meta.title}
            onChange={(event) => updateMeta("title", event.target.value)}
          />
        </div>
        <div className="field">
          <FieldLabel>Language</FieldLabel>
          <Input
            value={deck.meta.language}
            onChange={(event) => updateMeta("language", event.target.value)}
          />
        </div>
        <div className="field">
          <FieldLabel>Theme</FieldLabel>
          <Input
            value={deck.meta.theme}
            onChange={(event) => updateMeta("theme", event.target.value)}
          />
        </div>
        <div className="field">
          <FieldLabel>Template</FieldLabel>
          <Input
            value={deck.meta.template ?? "teaching"}
            onChange={(event) =>
              updateMeta(
                "template",
                event.target.value === "teaching" ? "teaching" : undefined,
              )
            }
          />
        </div>
      </Card>

      <section className="workspace" aria-label="Deck workspace">
        <Card className="outline-pane">
          <CardHeader className="pane-heading">
            <div>
              <CardTitle>Vault</CardTitle>
              <CardDescription>
                {vaultProjects.length} project{vaultProjects.length === 1 ? "" : "s"} · {deck.slides.length} slides
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pane-content">
            <ScrollArea className="slide-scroll">
              <section className="vault-list" aria-label="Projects">
                {vaultProjects.length === 0 ? (
                  <p>No projects yet.</p>
                ) : (
                  vaultProjects.map((project) => (
                    <button
                      className={task?.path === project.path ? "active" : ""}
                      disabled={!project.exists || isBusy}
                      key={project.path}
                      onClick={() => openVaultProject(project)}
                      type="button"
                    >
                      <strong>{project.name}</strong>
                      <span>{project.exists ? project.path : "Missing folder"}</span>
                    </button>
                  ))
                )}
              </section>
              <div className="outline-divider">
                <span>Outline</span>
              </div>
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

        <Card className="editor-pane" aria-label="Current slide editor">
          <CardHeader className="pane-heading">
            <div>
              <CardTitle>Slide Editor</CardTitle>
              <CardDescription>{selectedSlide.id}</CardDescription>
            </div>
          </CardHeader>

          <div className="editor-grid">
            <div className="field">
              <FieldLabel>Slide title</FieldLabel>
              <Input
                value={selectedSlide.title}
                onChange={(event) =>
                  updateSelectedSlide((slide) => ({
                    ...slide,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <FieldLabel>Slide type</FieldLabel>
              <Select
                value={selectedSlide.type}
                onValueChange={(value) =>
                  updateSelectedSlide((slide) => ({
                    ...slide,
                    type: value as SlideType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slideTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ContentEditor slide={selectedSlide} updateContent={updateContent} />

          <div className="field">
            <FieldLabel>Visual asset</FieldLabel>
            <Select
              value={selectedSlide.visual?.assetId ?? "__none"}
              onValueChange={(value) =>
                updateSelectedSlide((slide) => ({
                  ...slide,
                  visual:
                    value === "__none"
                      ? undefined
                      : {
                          assetId: value,
                          role: "primary",
                          alt: imageAssets.find((asset) => asset.id === value)?.description,
                        },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No visual</SelectItem>
                {imageAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="notes-editor field">
            <FieldLabel>Speaker notes</FieldLabel>
            <Textarea
              value={selectedSlide.speakerNotes ?? ""}
              onChange={(event) =>
                updateSelectedSlide((slide) => ({
                  ...slide,
                  speakerNotes: event.target.value,
                }))
              }
            />
          </div>
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

function ContentEditor({
  slide,
  updateContent,
}: {
  slide: DeckSlide;
  updateContent: (key: string, value: unknown) => void;
}) {
  switch (slide.type) {
    case "cover":
    case "closing":
      return (
        <div className="field-block field">
          <FieldLabel>{slide.type === "cover" ? "Subtitle" : "Statement"}</FieldLabel>
          <Textarea
            value={stringValue(slide.content, slide.type === "cover" ? "subtitle" : "statement")}
            onChange={(event) =>
              updateContent(slide.type === "cover" ? "subtitle" : "statement", event.target.value)
            }
          />
        </div>
      );
    case "metric_grid":
      return (
        <StructuredTextarea
          label="Metrics"
          value={slide.content.metrics}
          onChange={(value) => updateContent("metrics", value)}
        />
      );
    case "principle_card":
      return (
        <StructuredTextarea
          label="Cards"
          value={slide.content.cards}
          onChange={(value) => updateContent("cards", value)}
        />
      );
    case "two_column":
    case "comparison":
      return (
        <StructuredTextarea
          label="Columns"
          value={slide.content.columns}
          onChange={(value) => updateContent("columns", value)}
        />
      );
    case "code_explain":
      return (
        <div className="content-stack">
          <div className="field">
            <FieldLabel>Language</FieldLabel>
            <Input
              value={stringValue(slide.content, "language")}
              onChange={(event) => updateContent("language", event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel>Code</FieldLabel>
            <Textarea
              className="code-input"
              value={stringValue(slide.content, "code")}
              onChange={(event) => updateContent("code", event.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel>Note</FieldLabel>
            <Textarea
              value={stringValue(slide.content, "note")}
              onChange={(event) => updateContent("note", event.target.value)}
            />
          </div>
        </div>
      );
    case "trace_table":
      return (
        <div className="content-stack">
          <StructuredTextarea
            label="Columns"
            value={slide.content.columns}
            onChange={(value) => updateContent("columns", value)}
          />
          <StructuredTextarea
            label="Rows"
            value={slide.content.rows}
            onChange={(value) => updateContent("rows", value)}
          />
        </div>
      );
    case "bullet_summary":
    case "process":
    case "checklist":
      return (
        <StructuredTextarea
          label={slide.type === "process" ? "Steps" : "Items"}
          value={slide.content.points ?? slide.content.steps ?? slide.content.items}
          onChange={(value) =>
            updateContent(slide.type === "bullet_summary" ? "points" : slide.type === "process" ? "steps" : "items", value)
          }
        />
      );
    case "workflow":
      return (
        <StructuredTextarea
          label="Workflow steps"
          value={slide.content.steps}
          onChange={(value) => updateContent("steps", value)}
        />
      );
    case "note_callout":
      return (
        <div className="field-block field">
          <FieldLabel>Body</FieldLabel>
          <Textarea
            value={stringValue(slide.content, "body")}
            onChange={(event) => updateContent("body", event.target.value)}
          />
        </div>
      );
    case "section":
      return <div className="empty-state">Section slides use the title only.</div>;
  }
}

function StructuredTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(JSON.stringify(value ?? [], null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(JSON.stringify(value ?? [], null, 2));
    setError("");
  }, [value]);

  function applyDraft(nextDraft: string) {
    setDraft(nextDraft);
    try {
      onChange(JSON.parse(nextDraft));
      setError("");
    } catch {
      setError("Invalid JSON");
    }
  }

  return (
    <div className="field-block field">
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        className="json-input"
        value={draft}
        onChange={(event) => applyDraft(event.target.value)}
      />
      {error ? <small className="field-error">{error}</small> : null}
    </div>
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
