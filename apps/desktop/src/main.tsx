import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  ActiveSlidePreviewApp,
  emitActiveSlideToDesktopPreview,
  openDesktopActivePreview,
  writePreviewWindow,
} from "@/components/active-preview";
import {
  ExportView,
  ProjectView,
  SlidesView,
  WelcomeLauncher,
  WorkbenchShell,
} from "@/components/workbench-ui";
import {
  createEmptyTaskDeck,
  deckFromProjectFiles,
  initialDeck,
  layoutExampleBody,
  layoutLabel,
  normalizeTaskDeck,
  parseSlideMarkdownFile,
  slideLayoutId,
  slideProps,
  templatePresets,
  themeOptions,
  updateSlideMarkdownBody,
  updateSlideMarkdownFrontmatter,
  validateDeck,
} from "@/deck-model";
import type {
  BuildDeckResult,
  DeckAsset,
  DeckSpec,
  LayoutId,
  ProjectConfig,
  TaskFolderPayload,
  TemplateId,
  ThemeId,
  VaultPayload,
  VaultProject,
} from "@/types";
import "./styles.css";

function App() {
  if (window.location.hash === "#/active-preview") {
    return <ActiveSlidePreviewApp />;
  }

  return <DeckWorkbench />;
}

function DeckWorkbench() {
  const [deck, setDeck] = useState(initialDeck);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    title: initialDeck.meta.title,
    language: initialDeck.meta.language,
    template: initialDeck.meta.template ?? "teaching",
    theme: initialDeck.meta.theme as ThemeId,
  });
  const [slideMarkdownText, setSlideMarkdownText] = useState("");
  const [slideMarkdownError, setSlideMarkdownError] = useState("");
  const [selectedSlideFileName, setSelectedSlideFileName] = useState("");
  const [task, setTask] = useState<TaskFolderPayload | null>(null);
  const [taskStatus, setTaskStatus] = useState("No project opened.");
  const [taskError, setTaskError] = useState("");
  const [activePreviewUrl, setActivePreviewUrl] = useState("");
  const [activePreviewStatus, setActivePreviewStatus] = useState(
    "Preview will start after a slide is parsed.",
  );
  const [activePreviewError, setActivePreviewError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [vaultProjects, setVaultProjects] = useState<VaultProject[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const previewWindow = useRef<Window | null>(null);

  const currentTemplate = projectConfig.template;
  const currentPreset =
    templatePresets.find((preset) => preset.id === currentTemplate) ?? templatePresets[0];
  const templateLayouts = currentPreset.layouts;
  const selectedSlideFile =
    task?.slides.find((slideFile) => slideFile.fileName === selectedSlideFileName) ??
    task?.slides[0];
  const selectedIndex = Math.max(
    0,
    task?.slides.findIndex((slideFile) => slideFile.fileName === selectedSlideFile?.fileName) ?? 0,
  );
  const selectedSlide = selectedSlideFile?.slide ?? deck.slides[selectedIndex] ?? deck.slides[0];
  const selectedLayout = templateLayouts.includes(slideLayoutId(selectedSlide) as LayoutId)
    ? (slideLayoutId(selectedSlide) as LayoutId)
    : templateLayouts[0];
  const validation = useMemo(
    () => [
      ...(slideMarkdownError ? [`active slide markdown: ${slideMarkdownError}`] : []),
      ...validateDeck(deck),
    ],
    [deck, slideMarkdownError],
  );

  useEffect(() => {
    if (!task || !selectedSlide) {
      return;
    }
    if (previewWindow.current && !previewWindow.current.closed) {
      writePreviewWindow(previewWindow.current, selectedSlide);
    }
    void emitActiveSlideToDesktopPreview(selectedSlide);
  }, [selectedSlide, task]);

  useEffect(() => {
    if (!task || !selectedSlide || slideMarkdownError) {
      setActivePreviewUrl("");
      setActivePreviewError(slideMarkdownError);
      setActivePreviewStatus(
        slideMarkdownError ? "Fix slide markdown before previewing." : "Open a project to preview.",
      );
      return undefined;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      const singleSlideDeck: DeckSpec = {
        meta: {
          title: deck.meta.title,
          language: deck.meta.language,
          template: deck.meta.template,
          theme: deck.meta.theme,
        },
        theme: deck.theme,
        assets: deck.assets ?? [],
        slides: [selectedSlide],
      };
      setActivePreviewStatus("Rendering active slide with Slidev...");
      setActivePreviewError("");
      void invokeDesktop<BuildDeckResult>("preview_active_slide", {
        path: task.path,
        deck: singleSlideDeck,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }
          setActivePreviewUrl(result.url ?? "");
          setActivePreviewStatus("Live Slidev preview.");
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          setActivePreviewUrl("");
          setActivePreviewError(error instanceof Error ? error.message : String(error));
          setActivePreviewStatus("Active preview failed.");
        });
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    deck.assets,
    deck.meta.language,
    deck.meta.template,
    deck.meta.theme,
    deck.meta.title,
    deck.theme,
    selectedSlide,
    slideMarkdownError,
    task,
  ]);

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

  async function saveSlide() {
    if (!task || !selectedSlideFile) {
      setTaskError("Open a project before saving slide markdown.");
      return;
    }
    if (slideMarkdownError) {
      setTaskError("Fix the active slide markdown before saving.");
      return;
    }
    await runTaskAction("Save slide", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("save_slide_file", {
        path: task.path,
        fileName: selectedSlideFile.fileName,
        markdown: slideMarkdownText,
        projectConfig,
      });
      applyTaskPayload(payload, selectedSlideFile.fileName);
      setTaskStatus(`Saved ${selectedSlideFile.path}.`);
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
    setTaskError(
      "AI draft is paused for the Markdown project format. M1 focuses on project files, preview, and export.",
    );
  }

  async function previewDeck() {
    if (!task) {
      setTaskError("Open a task folder before previewing the deck.");
      return;
    }
    if (slideMarkdownError) {
      setTaskError("Fix the active slide markdown before previewing the deck.");
      return;
    }
    await runTaskAction("Preview deck", async () => {
      if (selectedSlideFile) {
        await invokeDesktop("save_slide_file", {
          path: task.path,
          fileName: selectedSlideFile.fileName,
          markdown: slideMarkdownText,
          projectConfig,
        });
      }
      const result = await invokeDesktop<BuildDeckResult>("preview_task_deck", {
        path: task.path,
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
    if (slideMarkdownError) {
      setTaskError("Fix the active slide markdown before exporting PDF.");
      return;
    }
    await runTaskAction("Export PDF", async () => {
      if (selectedSlideFile) {
        await invokeDesktop("save_slide_file", {
          path: task.path,
          fileName: selectedSlideFile.fileName,
          markdown: slideMarkdownText,
          projectConfig,
        });
      }
      const result = await invokeDesktop<BuildDeckResult>("build_task_deck", {
        path: task.path,
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

  async function addSlide() {
    if (!task) {
      setTaskError("Open a project before adding slides.");
      return;
    }
    await runTaskAction("Add slide", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("create_slide_file", {
        path: task.path,
        layout: selectedLayout,
      });
      const nextFile = payload.slides[payload.slides.length - 1]?.fileName;
      applyTaskPayload(payload, nextFile);
      setTaskStatus(`Added ${layoutLabel(selectedLayout)} slide.`);
    });
  }

  async function duplicateSlide() {
    if (!task || !selectedSlideFile) {
      return;
    }
    await runTaskAction("Duplicate slide", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("duplicate_slide_file", {
        path: task.path,
        fileName: selectedSlideFile.fileName,
        markdown: slideMarkdownText,
      });
      const nextFile = payload.slides[payload.slides.length - 1]?.fileName;
      applyTaskPayload(payload, nextFile);
      setTaskStatus("Duplicated current slide.");
    });
  }

  async function deleteSlide() {
    if (!task || !selectedSlideFile) {
      return;
    }
    if (task.slides.length <= 1) {
      setTaskError("A project must keep at least one slide.");
      return;
    }
    const nextIndex = Math.max(0, Math.min(selectedIndex, task.slides.length - 2));
    await runTaskAction("Delete slide", async () => {
      const payload = await invokeDesktop<TaskFolderPayload>("delete_slide_file", {
        path: task.path,
        fileName: selectedSlideFile.fileName,
      });
      applyTaskPayload(payload, payload.slides[nextIndex]?.fileName);
      setTaskStatus("Deleted current slide.");
    });
  }

  function updateTemplate(template: TemplateId) {
    const preset = templatePresets.find((item) => item.id === template) ?? templatePresets[0];
    updateProjectConfig({
      ...projectConfig,
      template,
      theme: preset.theme,
    });
    setTaskStatus(`Selected ${preset.label} template.`);
  }

  function updateSelectedSlideLayout(layout: LayoutId) {
    if (!selectedSlideFile) {
      return;
    }
    updateSlideMarkdown(updateSlideMarkdownFrontmatter(slideMarkdownText, { layout }));
    setTaskStatus(`Changed active slide layout to ${layoutLabel(layout)}.`);
  }

  function insertLayoutExample() {
    if (!selectedSlideFile) {
      return;
    }
    const nextMarkdown = updateSlideMarkdownBody(
      updateSlideMarkdownFrontmatter(slideMarkdownText, { layout: selectedLayout }),
      layoutExampleBody(selectedLayout),
    );
    updateSlideMarkdown(nextMarkdown);
    setTaskStatus(`Inserted ${layoutLabel(selectedLayout)} example body.`);
  }

  function updateTheme(theme: ThemeId) {
    const option = themeOptions.find((item) => item.id === theme);
    updateProjectConfig({
      ...projectConfig,
      theme,
      template: option?.template ?? projectConfig.template,
    });
    setTaskStatus(`Selected ${theme}.`);
  }

  function attachVisualAsset(asset: DeckAsset) {
    if (!selectedSlideFile || asset.kind !== "image") {
      return;
    }
    updateSlideMarkdown(
      updateSlideMarkdownFrontmatter(slideMarkdownText, {
        props: {
          ...slideProps(selectedSlide),
          image: asset.path,
          alt: asset.description || asset.path,
        },
      }),
    );
    setTaskStatus(`Attached ${asset.path} to current slide.`);
  }

  async function copyAssetReference(asset: DeckAsset) {
    const snippet =
      asset.kind === "image"
        ? `props:\n  image: ${asset.path}\n  alt: ${asset.description || asset.path}`
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

  function applyTaskPayload(payload: TaskFolderPayload, preferredFileName?: string) {
    setTask(payload);
    setProjectConfig(payload.projectConfig);
    const nextDeck = payload.deck
      ? normalizeTaskDeck(payload.deck, payload)
      : createEmptyTaskDeck(payload);
    const nextFile =
      payload.slides.find((slideFile) => slideFile.fileName === preferredFileName) ??
      payload.slides[0];
    applyDeck(nextDeck, nextFile?.fileName);
    setSlideMarkdownText(nextFile?.markdown ?? "");
    setSlideMarkdownError("");
  }

  function applyDeck(nextDeck: DeckSpec, selectedFileName?: string) {
    setDeck(nextDeck);
    setSelectedSlideFileName(selectedFileName ?? task?.slides[0]?.fileName ?? "");
    setSlideMarkdownError("");
  }

  function updateProjectConfig(nextConfig: ProjectConfig) {
    setProjectConfig(nextConfig);
    if (!task) {
      return;
    }
    const nextDeck = deckFromProjectFiles(nextConfig, task.slides, task.assets);
    setDeck(nextDeck);
    setTask({
      ...task,
      projectConfig: nextConfig,
      deck: nextDeck,
    });
  }

  function updateSlideMarkdown(value: string) {
    setSlideMarkdownText(value);
    try {
      if (!task || !selectedSlideFile) {
        throw new Error("No active slide file.");
      }
      const parsedSlideFile = parseSlideMarkdownFile(selectedSlideFile.fileName, value);
      const duplicateId = task.slides.some(
        (slideFile) =>
          slideFile.fileName !== selectedSlideFile.fileName &&
          slideFile.slide.id === parsedSlideFile.slide.id,
      );
      if (duplicateId) {
        throw new Error(`slide.id "${parsedSlideFile.slide.id}" already exists.`);
      }
      const nextSlides = task.slides.map((slideFile) =>
        slideFile.fileName === selectedSlideFile.fileName ? parsedSlideFile : slideFile,
      );
      const nextDeck = deckFromProjectFiles(projectConfig, nextSlides, task.assets);
      setTask({
        ...task,
        slides: nextSlides,
        deck: nextDeck,
      });
      setDeck(nextDeck);
      setSlideMarkdownError("");
      void emitActiveSlideToDesktopPreview(parsedSlideFile.slide);
    } catch (error) {
      setSlideMarkdownError(error instanceof Error ? error.message : String(error));
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
    setProjectConfig({
      title: initialDeck.meta.title,
      language: initialDeck.meta.language,
      template: initialDeck.meta.template ?? "teaching",
      theme: initialDeck.meta.theme as ThemeId,
    });
    setSlideMarkdownText("");
    setSlideMarkdownError("");
    setSelectedSlideFileName("");
    setTaskError("");
    setTaskStatus("No project opened.");
    void window.slideforge?.showWelcomeWindow();
  }

  if (!task) {
    return (
      <WelcomeLauncher
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
    <WorkbenchShell
      deck={deck}
      editorError={slideMarkdownError}
      exportView={
        <ExportView
          editorError={slideMarkdownError}
          isBusy={isBusy}
          onExportPdf={() => void exportPdf()}
          onPreviewDeck={() => void previewDeck()}
          status={taskError || taskStatus}
          task={task}
        />
      }
      isBusy={isBusy}
      onCheckYaml={() =>
        setTaskStatus(
          validation.length === 0
            ? "Local validation passed."
            : `Local validation found ${validation.length} issue(s).`,
        )
      }
      onOpenActivePreview={() => void openActivePreview()}
      onSaveDeck={() => void saveSlide()}
      projectView={
        <ProjectView
          currentTemplate={currentTemplate}
          deck={deck}
          isBusy={isBusy}
          onAssetDrop={handleAssetDrop}
          onAttachVisualAsset={attachVisualAsset}
          onCopyAssetReference={(asset) => void copyAssetReference(asset)}
          onDraftDeckWithAi={() => void draftDeckWithAi()}
          onImportAssets={() => void importAssets()}
          onOpenTaskFolder={() => void openTaskFolder()}
          onReloadTaskFolder={() => void reloadTaskFolder()}
          onReturnToWelcome={returnToWelcome}
          onSaveDeck={() => void saveSlide()}
          onUpdateTemplate={updateTemplate}
          onUpdateTheme={updateTheme}
          projectConfig={projectConfig}
          task={task}
          templatePresets={templatePresets}
          themeOptions={themeOptions}
        />
      }
      slidesView={
        <SlidesView
          assets={deck.assets ?? []}
          activePreviewError={activePreviewError}
          activePreviewStatus={activePreviewStatus}
          activePreviewUrl={activePreviewUrl}
          deck={deck}
          editorError={slideMarkdownError}
          editorText={slideMarkdownText}
          onAddSlide={() => void addSlide()}
          onDeleteSlide={() => void deleteSlide()}
          onDuplicateSlide={() => void duplicateSlide()}
          onSelectSlideFile={(fileName) => {
            const slideFile = task.slides.find((item) => item.fileName === fileName);
            setSelectedSlideFileName(fileName);
            setSlideMarkdownText(slideFile?.markdown ?? "");
            setSlideMarkdownError("");
          }}
          onUpdateSelectedLayout={updateSelectedSlideLayout}
          onUpdateEditorText={updateSlideMarkdown}
          onInsertLayoutExample={insertLayoutExample}
          projectPath={task.path}
          selectedLayout={selectedLayout}
          selectedSlideFile={selectedSlideFile}
          selectedSlide={selectedSlide}
          slideFiles={task.slides}
          templateLayouts={templateLayouts}
          validation={validation}
        />
      }
      status={taskError || taskStatus}
      statusTone={taskError ? "warn" : "normal"}
    />
  );
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
