import type * as React from "react";
import {
  BadgeCheckIcon,
  ClipboardPlusIcon,
  CopyIcon,
  DownloadIcon,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  Pane,
  PaneHeader,
  SidebarItem,
  StatusPill,
  Toolbar,
} from "@/components/shell-primitives";
import { YamlCodeEditor } from "@/components/yaml-code-editor";
import {
  arrayValue,
  assetFileUrl,
  layoutContract,
  layoutLabel,
  slideLayoutId,
  slideProps,
  stringValue,
  wordCount,
} from "@/deck-model";
import type {
  DeckAsset,
  DeckSlide,
  DeckSpec,
  LayoutId,
  ProjectConfig,
  SlideFile,
  TaskFolderPayload,
  TemplateId,
  ThemeId,
  VaultProject,
} from "@/types";

export function WorkbenchShell({
  deck,
  editorError,
  exportView,
  isBusy,
  onCheckYaml,
  onOpenActivePreview,
  onSaveDeck,
  projectView,
  slidesView,
  status,
  statusTone,
}: {
  deck: DeckSpec;
  editorError: string;
  exportView: React.ReactNode;
  isBusy: boolean;
  onCheckYaml: () => void;
  onOpenActivePreview: () => void;
  onSaveDeck: () => void;
  projectView: React.ReactNode;
  slidesView: React.ReactNode;
  status: string;
  statusTone: "normal" | "warn";
}) {
  return (
    <main className="grid h-screen grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden bg-slate-100 p-2 text-slate-950">
      <TopCommandBar
        editorError={editorError}
        isBusy={isBusy}
        onCheckYaml={onCheckYaml}
        onOpenActivePreview={onOpenActivePreview}
        onSaveDeck={onSaveDeck}
        title={deck.meta.title || "Untitled deck"}
      />
      <Tabs defaultValue="slides" className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2">
          <TabsList className="h-8 bg-slate-100">
            <TabsTrigger className="gap-1.5 text-xs" value="project">
              <FolderOpenIcon className="size-3.5" />
              Project
            </TabsTrigger>
            <TabsTrigger className="gap-1.5 text-xs" value="slides">
              <PresentationIcon className="size-3.5" />
              Slides
            </TabsTrigger>
            <TabsTrigger className="gap-1.5 text-xs" value="export">
              <DownloadIcon className="size-3.5" />
              Export
            </TabsTrigger>
          </TabsList>
          <div className="flex min-w-0 items-center gap-2 border-l border-slate-200 pl-3">
            <span className="h-5 w-px bg-teal-500" />
            <p
              className={
                statusTone === "warn"
                  ? "truncate text-xs font-medium text-rose-700"
                  : "truncate text-xs text-slate-500"
              }
            >
              {status}
            </p>
          </div>
        </div>
        <TabsContent className="min-h-0 data-[state=inactive]:hidden" value="project">
          {projectView}
        </TabsContent>
        <TabsContent className="min-h-0 data-[state=inactive]:hidden" value="slides">
          {slidesView}
        </TabsContent>
        <TabsContent className="min-h-0 data-[state=inactive]:hidden" value="export">
          {exportView}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TopCommandBar({
  editorError,
  isBusy,
  onCheckYaml,
  onOpenActivePreview,
  onSaveDeck,
  title,
}: {
  editorError: string;
  isBusy: boolean;
  onCheckYaml: () => void;
  onOpenActivePreview: () => void;
  onSaveDeck: () => void;
  title: string;
}) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-teal-600">SlideForge</p>
        <h1 className="truncate text-base font-semibold leading-tight text-slate-950">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button type="button" variant="secondary" size="sm" onClick={onOpenActivePreview}>
          <PanelsTopLeftIcon />
          Slide Preview
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCheckYaml}>
          <BadgeCheckIcon />
          Check Slide
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSaveDeck} disabled={isBusy}>
          <SaveIcon />
          Save Slide
        </Button>
        {editorError ? <StatusPill tone="warn">Markdown error</StatusPill> : null}
      </div>
    </header>
  );
}

export function ProjectView({
  currentTemplate,
  deck,
  isBusy,
  onAssetDrop,
  onAttachVisualAsset,
  onCopyAssetReference,
  onDraftDeckWithAi,
  onImportAssets,
  onOpenTaskFolder,
  onReloadTaskFolder,
  onReturnToWelcome,
  onSaveDeck,
  onUpdateTemplate,
  onUpdateTheme,
  projectConfig,
  task,
  templatePresets,
  themeOptions,
}: {
  currentTemplate: TemplateId;
  deck: DeckSpec;
  isBusy: boolean;
  onAssetDrop: (event: React.DragEvent) => void;
  onAttachVisualAsset: (asset: DeckAsset) => void;
  onCopyAssetReference: (asset: DeckAsset) => void;
  onDraftDeckWithAi: () => void;
  onImportAssets: () => void;
  onOpenTaskFolder: () => void;
  onReloadTaskFolder: () => void;
  onReturnToWelcome: () => void;
  onSaveDeck: () => void;
  onUpdateTemplate: (template: TemplateId) => void;
  onUpdateTheme: (theme: ThemeId) => void;
  projectConfig: ProjectConfig;
  task: TaskFolderPayload;
  templatePresets: Array<{ id: TemplateId; label: string; theme: ThemeId; layouts: LayoutId[] }>;
  themeOptions: Array<{ id: ThemeId; label: string; template: TemplateId }>;
}) {
  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
      <Pane className="shrink-0">
        <PaneHeader
          title={task.name}
          eyebrow={task.path}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenTaskFolder}
                disabled={isBusy}
              >
                <FolderOpenIcon />
                Switch
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReturnToWelcome}
                disabled={isBusy}
              >
                Projects
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReloadTaskFolder}
                disabled={isBusy}
              >
                <RefreshCwIcon />
                Reload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveDeck}
                disabled={isBusy}
              >
                <SaveIcon />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onDraftDeckWithAi}
                disabled={isBusy || !task.envStatus.hasKey || !task.envStatus.hasModel}
                variant={task.envStatus.hasKey && task.envStatus.hasModel ? "default" : "secondary"}
              >
                <WandSparklesIcon />
                Draft AI
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-[9rem_9rem_minmax(0,1fr)] items-end gap-2 border-b border-slate-200 bg-white p-2">
          <div className="grid gap-1">
            <Label className="text-[11px] font-semibold text-slate-500">Template</Label>
            <Select
              value={currentTemplate}
              onValueChange={(value) => onUpdateTemplate(value as TemplateId)}
            >
              <SelectTrigger className="h-8 text-xs">
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
          <div className="grid gap-1">
            <Label className="text-[11px] font-semibold text-slate-500">Theme</Label>
            <Select
              value={deck.meta.theme}
              onValueChange={(value) => onUpdateTheme(value as ThemeId)}
            >
              <SelectTrigger className="h-8 text-xs">
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
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <MetricChip
              icon={<FileTextIcon />}
              label="Slides"
              value={`${task.slides.length} files`}
            />
            <MetricChip icon={<FileTextIcon />} label="Project" value="project.yaml" />
            <MetricChip icon={<ImageIcon />} label="Assets" value={`${task.assets.length} files`} />
            <StatusPill tone={task.envStatus.hasKey && task.envStatus.hasModel ? "ok" : "warn"}>
              {task.envStatus.message}
            </StatusPill>
          </div>
        </div>
      </Pane>

      <section className="grid min-h-0 grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <DocumentPane
          body={projectYamlPreview(projectConfig)}
          detail="project.yaml"
          title="Project Config"
        />
        <DocumentPane
          body={task.slides
            .map(
              (slide) =>
                `${slide.fileName} · ${slide.frontmatter.layout} · ${slide.frontmatter.title}`,
            )
            .join("\n")}
          detail="slides/*.md"
          title="Slide Files"
        />
        <AssetsPane
          assets={task.assets}
          missingAssetRefs={task.missingAssetRefs}
          onAssetDrop={onAssetDrop}
          onAttachVisualAsset={onAttachVisualAsset}
          onCopyAssetReference={onCopyAssetReference}
          onImportAssets={onImportAssets}
          referencedAssets={task.referencedAssets.map((asset) => asset.path)}
        />
      </section>
    </section>
  );
}

function MetricChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
      <span className="text-teal-600 [&_svg]:size-3.5">{icon}</span>
      <span className="text-slate-500">{label}</span>
      <strong className="truncate font-semibold text-slate-900">{value}</strong>
    </div>
  );
}

function DocumentPane({ body, detail, title }: { body: string; detail: string; title: string }) {
  return (
    <Pane>
      <PaneHeader
        title={title}
        eyebrow={detail}
        actions={<StatusPill>{wordCount(body)} chars</StatusPill>}
      />
      <ScrollArea className="min-h-0 flex-1">
        <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-6 text-slate-700">
          {body}
        </pre>
      </ScrollArea>
    </Pane>
  );
}

function projectYamlPreview(projectConfig: ProjectConfig): string {
  return [
    `title: ${projectConfig.title}`,
    `language: ${projectConfig.language}`,
    `template: ${projectConfig.template}`,
    `theme: ${projectConfig.theme}`,
  ].join("\n");
}

function AssetsPane({
  assets,
  missingAssetRefs,
  onAssetDrop,
  onAttachVisualAsset,
  onCopyAssetReference,
  onImportAssets,
  referencedAssets,
}: {
  assets: DeckAsset[];
  missingAssetRefs: string[];
  onAssetDrop: (event: React.DragEvent) => void;
  onAttachVisualAsset: (asset: DeckAsset) => void;
  onCopyAssetReference: (asset: DeckAsset) => void;
  onImportAssets: () => void;
  referencedAssets: string[];
}) {
  return (
    <Pane
      className="col-span-2"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onAssetDrop}
    >
      <PaneHeader
        title="Assets"
        eyebrow="Drop files here or import into assets/"
        actions={
          <>
            <StatusPill>{assets.length} files</StatusPill>
            <Button type="button" variant="outline" size="sm" onClick={onImportAssets}>
              <UploadIcon />
              Import
            </Button>
          </>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        {assets.length === 0 ? (
          <EmptyState title="No assets yet">Drop image/text/code files into this panel.</EmptyState>
        ) : (
          <div className="grid gap-1.5 p-2">
            {assets.map((asset) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_4rem_auto_auto] items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                key={asset.id}
              >
                <strong className="truncate font-medium text-slate-900">{asset.path}</strong>
                <span className="text-[11px] font-semibold uppercase text-slate-500">
                  {asset.kind}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => onCopyAssetReference(asset)}
                >
                  <CopyIcon />
                  Ref
                </Button>
                {asset.kind === "image" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onAttachVisualAsset(asset)}
                  >
                    <ClipboardPlusIcon />
                    Use
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="flex min-h-9 items-center gap-1.5 border-t border-slate-200 px-2 text-xs">
        <span className="font-medium text-slate-500">Referenced</span>
        {referencedAssets.length === 0 ? <StatusPill>none</StatusPill> : null}
        {referencedAssets.map((assetPath) => (
          <StatusPill key={assetPath}>{assetPath}</StatusPill>
        ))}
        {missingAssetRefs.map((assetRef) => (
          <StatusPill key={assetRef} tone="warn">
            missing {assetRef}
          </StatusPill>
        ))}
      </div>
    </Pane>
  );
}

export function SlidesView({
  assets,
  activePreviewError,
  activePreviewStatus,
  activePreviewUrl,
  deck,
  editorError,
  editorText,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onSelectSlideFile,
  onUpdateSelectedLayout,
  onUpdateEditorText,
  onInsertLayoutExample,
  projectPath,
  selectedLayout,
  selectedSlideFile,
  selectedSlide,
  slideFiles,
  templateLayouts,
  validation,
}: {
  assets: DeckAsset[];
  activePreviewError: string;
  activePreviewStatus: string;
  activePreviewUrl: string;
  deck: DeckSpec;
  editorError: string;
  editorText: string;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  onDuplicateSlide: () => void;
  onSelectSlideFile: (fileName: string) => void;
  onUpdateSelectedLayout: (layout: LayoutId) => void;
  onUpdateEditorText: (value: string) => void;
  onInsertLayoutExample: () => void;
  projectPath?: string;
  selectedLayout: LayoutId;
  selectedSlideFile?: SlideFile;
  selectedSlide: DeckSlide;
  slideFiles: SlideFile[];
  templateLayouts: LayoutId[];
  validation: string[];
}) {
  return (
    <section className="grid h-full min-h-0 grid-cols-[220px_minmax(360px,0.8fr)_minmax(500px,1.35fr)] gap-2">
      <SlidesSidebar
        deck={deck}
        onAddSlide={onAddSlide}
        onDeleteSlide={onDeleteSlide}
        onDuplicateSlide={onDuplicateSlide}
        onSelectSlideFile={onSelectSlideFile}
        selectedSlideFile={selectedSlideFile}
        slideFiles={slideFiles}
      />
      <YamlEditorPane
        deck={deck}
        editorError={editorError}
        editorText={editorText}
        onUpdateSelectedLayout={onUpdateSelectedLayout}
        onUpdateEditorText={onUpdateEditorText}
        onInsertLayoutExample={onInsertLayoutExample}
        selectedLayout={selectedLayout}
        selectedSlideFile={selectedSlideFile}
        selectedSlide={selectedSlide}
        templateLayouts={templateLayouts}
      />
      <InspectorPane
        activePreviewError={activePreviewError}
        activePreviewStatus={activePreviewStatus}
        activePreviewUrl={activePreviewUrl}
        assets={assets}
        projectPath={projectPath}
        selectedSlide={selectedSlide}
        validation={validation}
      />
    </section>
  );
}

function SlidesSidebar({
  deck,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onSelectSlideFile,
  selectedSlideFile,
  slideFiles,
}: {
  deck: DeckSpec;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  onDuplicateSlide: () => void;
  onSelectSlideFile: (fileName: string) => void;
  selectedSlideFile?: SlideFile;
  slideFiles: SlideFile[];
}) {
  return (
    <Pane>
      <PaneHeader
        title="Slides"
        eyebrow={`${deck.slides.length} slide${deck.slides.length === 1 ? "" : "s"}`}
      />
      <Toolbar className="grid grid-cols-3">
        <Button type="button" variant="outline" size="xs" onClick={onAddSlide}>
          <FilePlus2Icon />
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onDuplicateSlide}
          disabled={!selectedSlideFile}
        >
          <CopyIcon />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onDeleteSlide}
          disabled={deck.slides.length <= 1}
        >
          <Trash2Icon />
          Del
        </Button>
      </Toolbar>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="grid gap-1 p-2" aria-label="Slides">
          {slideFiles.map((slideFile, index) => (
            <SidebarItem
              active={slideFile.fileName === selectedSlideFile?.fileName}
              key={slideFile.fileName}
              onClick={() => onSelectSlideFile(slideFile.fileName)}
            >
              <span className="grid h-6 w-7 place-items-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs font-semibold">
                  {slideFile.frontmatter.title}
                </strong>
                <span className="block truncate text-[10px] text-slate-500">
                  {slideFile.fileName}
                </span>
                <span className="mt-1 inline-flex max-w-full rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  <span className="truncate">{slideFile.frontmatter.layout}</span>
                </span>
              </span>
            </SidebarItem>
          ))}
        </nav>
      </ScrollArea>
    </Pane>
  );
}

function YamlEditorPane({
  deck,
  editorError,
  editorText,
  onUpdateSelectedLayout,
  onUpdateEditorText,
  onInsertLayoutExample,
  selectedLayout,
  selectedSlideFile,
  selectedSlide,
  templateLayouts,
}: {
  deck: DeckSpec;
  editorError: string;
  editorText: string;
  onUpdateSelectedLayout: (layout: LayoutId) => void;
  onUpdateEditorText: (value: string) => void;
  onInsertLayoutExample: () => void;
  selectedLayout: LayoutId;
  selectedSlideFile?: SlideFile;
  selectedSlide: DeckSlide;
  templateLayouts: LayoutId[];
}) {
  return (
    <Pane>
      <PaneHeader
        title={selectedSlideFile?.fileName ?? selectedSlide.title ?? "Untitled slide"}
        eyebrow={`slide markdown · ${selectedSlide.id}`}
        actions={
          <StatusPill tone={editorError ? "warn" : "ok"}>
            {editorError ? "invalid" : "parsed"}
          </StatusPill>
        }
      />
      <Toolbar className="text-[11px] font-semibold text-slate-500">
        <span>Layout</span>
        <Select
          value={selectedLayout}
          onValueChange={(value) => onUpdateSelectedLayout(value as LayoutId)}
        >
          <SelectTrigger className="h-7 w-48 text-xs">
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
        <span>{deck.slides.length} deck slides</span>
        <span>{deck.assets?.length ?? 0} assets</span>
        <span>{editorText.length} chars</span>
        <Button type="button" variant="secondary" size="xs" onClick={onInsertLayoutExample}>
          <ClipboardPlusIcon />
          Example
        </Button>
      </Toolbar>
      <YamlCodeEditor
        diagnostics={editorError ? [editorError] : []}
        value={editorText}
        onChange={onUpdateEditorText}
      />
    </Pane>
  );
}

function InspectorPane({
  activePreviewError,
  activePreviewStatus,
  activePreviewUrl,
  assets,
  projectPath,
  selectedSlide,
  validation,
}: {
  activePreviewError: string;
  activePreviewStatus: string;
  activePreviewUrl: string;
  assets: DeckAsset[];
  projectPath?: string;
  selectedSlide: DeckSlide;
  validation: string[];
}) {
  return (
    <section className="grid min-h-0 grid-rows-[minmax(280px,1.1fr)_minmax(220px,0.9fr)] gap-2">
      <Pane>
        <PaneHeader
          title="Preview"
          eyebrow="Live Slidev active slide"
          actions={
            <StatusPill tone={activePreviewError ? "warn" : activePreviewUrl ? "ok" : "neutral"}>
              {activePreviewError ? "failed" : activePreviewUrl ? "live" : "rendering"}
            </StatusPill>
          }
        />
        <ActiveSlideFrame
          activePreviewError={activePreviewError}
          activePreviewStatus={activePreviewStatus}
          activePreviewUrl={activePreviewUrl}
          assets={assets}
          projectPath={projectPath}
          selectedSlide={selectedSlide}
        />
      </Pane>
      <Pane>
        <PaneHeader
          title="Inspect"
          eyebrow="Contract and structure"
          actions={
            <StatusPill tone={validation.length === 0 ? "ok" : "warn"}>
              {validation.length === 0 ? "valid" : `${validation.length} issues`}
            </StatusPill>
          }
        />
        <Tabs defaultValue="guide" className="min-h-0 flex-1">
          <TabsList className="mx-2 mt-2 grid h-8 grid-cols-3 bg-slate-100">
            <TabsTrigger value="guide" className="text-xs">
              Guide
            </TabsTrigger>
            <TabsTrigger value="checks" className="text-xs">
              Checks
            </TabsTrigger>
            <TabsTrigger value="spec" className="text-xs">
              Spec
            </TabsTrigger>
          </TabsList>
          <TabsContent value="guide" className="min-h-0 overflow-auto data-[state=inactive]:hidden">
            <LayoutGuide slide={selectedSlide} />
          </TabsContent>
          <TabsContent
            value="checks"
            className="min-h-0 overflow-auto data-[state=inactive]:hidden"
          >
            <section className="grid gap-2 p-3 text-xs leading-5 text-slate-600">
              {validation.length === 0 ? (
                <p>No blocking issues.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {validation.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>
          <TabsContent value="spec" className="min-h-0 overflow-auto data-[state=inactive]:hidden">
            <section className="p-3">
              <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
                {JSON.stringify(selectedSlide, null, 2)}
              </pre>
            </section>
          </TabsContent>
        </Tabs>
      </Pane>
    </section>
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
  const imagePath =
    typeof slideProps(slide).image === "string" ? String(slideProps(slide).image) : "";
  const visualAsset =
    assets.find((asset) => asset.path === imagePath) ??
    assets.find((asset) => asset.id === slide.visual?.assetId);
  return (
    <section className="grid gap-3 p-3">
      <span className="text-[11px] font-bold text-teal-600">{slideLayoutId(slide)}</span>
      <h3 className="text-base font-semibold leading-snug text-slate-950">{slide.title}</h3>
      {visualAsset ? (
        <VisualPreview asset={visualAsset} projectPath={projectPath} slide={slide} />
      ) : null}
      <PreviewBody slide={slide} />
    </section>
  );
}

function ActiveSlideFrame({
  activePreviewError,
  activePreviewStatus,
  activePreviewUrl,
  assets,
  projectPath,
  selectedSlide,
}: {
  activePreviewError: string;
  activePreviewStatus: string;
  activePreviewUrl: string;
  assets: DeckAsset[];
  projectPath?: string;
  selectedSlide: DeckSlide;
}) {
  if (activePreviewUrl) {
    return (
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-slate-100">
        <div className="min-h-0 p-2">
          <iframe
            className="h-full w-full rounded-md border border-slate-200 bg-white"
            src={activePreviewUrl}
            title="Live Slidev active slide preview"
          />
        </div>
        <div className="flex min-h-8 items-center justify-between border-t border-slate-200 bg-white px-2 text-[11px] text-slate-500">
          <span>{activePreviewStatus}</span>
          <span className="truncate">{activePreviewUrl}</span>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="grid gap-2 p-2">
        <div
          className={
            activePreviewError
              ? "rounded-md border border-rose-200 bg-rose-50 p-2 text-xs leading-5 text-rose-700"
              : "rounded-md border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-500"
          }
        >
          {activePreviewError || activePreviewStatus}
        </div>
        <SlidePreview assets={assets} projectPath={projectPath} slide={selectedSlide} />
      </div>
    </ScrollArea>
  );
}

function LayoutGuide({ slide }: { slide: DeckSlide }) {
  const contract = layoutContract(slideLayoutId(slide));
  return (
    <section className="grid gap-3 p-3 text-xs leading-5 text-slate-600">
      <div className="grid gap-1">
        <span className="text-[11px] font-bold uppercase text-teal-600">{contract.layout}</span>
        <h3 className="text-sm font-semibold text-slate-950">{contract.title}</h3>
        <p>{contract.summary}</p>
      </div>
      <ul className="list-disc space-y-1 pl-4">
        {contract.help.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Example body</span>
        <pre className="max-h-60 overflow-auto rounded-md bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
          {contract.exampleBody}
        </pre>
      </div>
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
      <figure className="grid gap-1 text-[11px] text-slate-500">
        <img
          className="max-h-40 max-w-full rounded-md border border-slate-200 object-contain"
          src={assetFileUrl(projectPath, asset.path)}
          alt={slide.visual?.alt || asset.path}
        />
        <figcaption className="truncate">
          {asset.path}
          {slide.visual?.alt ? ` (${slide.visual.alt})` : ""}
        </figcaption>
      </figure>
    );
  }

  return (
    <p className="text-xs text-slate-500">
      Visual: {asset.path}
      {slide.visual?.alt ? ` (${slide.visual.alt})` : ""}
    </p>
  );
}

function PreviewBody({ slide }: { slide: DeckSlide }) {
  const props = slideProps(slide);
  const layout = slideLayoutId(slide);
  if (layout === "title-cover") {
    return <LeadText>{stringValue(props, "subtitle") || stringValue(props, "lead")}</LeadText>;
  }

  if (layout === "section-divider") {
    return <LeadText>{stringValue(props, "lead") || stringValue(props, "subtitle")}</LeadText>;
  }

  if (layout === "quote-callout") {
    return (
      <blockquote className="rounded-md border-l-4 border-teal-500 bg-teal-50/70 px-3 py-2 text-xs font-medium leading-5 text-slate-700">
        {stringValue(props, "quote") ||
          stringValue(props, "statement") ||
          stringValue(props, "body") ||
          "No quote parsed."}
      </blockquote>
    );
  }

  if (layout === "bullet-list") {
    return (
      <MiniList
        items={
          arrayValue(props, "points").length
            ? arrayValue(props, "points")
            : arrayValue(props, "items")
        }
      />
    );
  }

  if (layout === "image-left-text-right") {
    return (
      <div className="grid gap-2">
        {stringValue(props, "image") ? (
          <StatusPill>{stringValue(props, "image")}</StatusPill>
        ) : null}
        <MiniList items={arrayValue(props, "points")} />
        {stringValue(props, "note") ? (
          <p className="text-xs leading-5 text-slate-500">{stringValue(props, "note")}</p>
        ) : null}
      </div>
    );
  }

  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return <MiniProgress done={arrayValue(props, "done")} doing={arrayValue(props, "doing")} />;
  }

  if (layout === "system-flow" || layout === "research-system-concept") {
    return (
      <div className="grid gap-2">
        <MiniFlow steps={arrayValue(props, "steps")} />
        {arrayValue(props, "sideItems").length ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <strong className="text-[11px] text-slate-700">
              {stringValue(props, "sideTitle") || "Signals"}
            </strong>
            <MiniList items={arrayValue(props, "sideItems")} />
          </div>
        ) : null}
        {stringValue(props, "note") ? (
          <p className="text-xs leading-5 text-slate-500">{stringValue(props, "note")}</p>
        ) : null}
      </div>
    );
  }

  if (layout === "code-walkthrough") {
    return (
      <div className="grid gap-2">
        <pre className="max-h-40 overflow-auto rounded-md bg-slate-950 p-2 text-[11px] leading-5 text-slate-100">
          {stringValue(props, "code") || "// No code block parsed."}
        </pre>
        <MiniList items={arrayValue(props, "points")} />
        {stringValue(props, "note") ? (
          <p className="text-xs leading-5 text-slate-500">{stringValue(props, "note")}</p>
        ) : null}
      </div>
    );
  }

  if (layout === "exercise-checklist") {
    return <MiniChecklist items={arrayValue(props, "items")} />;
  }

  if (layout === "two-column") {
    return <MiniColumns columns={arrayValue(props, "columns")} />;
  }

  return (
    <MiniList
      items={
        arrayValue(props, "points").length
          ? arrayValue(props, "points")
          : arrayValue(props, "items")
      }
    />
  );
}

function LeadText({ children }: { children: string }) {
  return children ? (
    <p className="text-xs leading-5 text-slate-500">{children}</p>
  ) : (
    <EmptyPreviewMessage>No subtitle or lead parsed.</EmptyPreviewMessage>
  );
}

function MiniList({ items }: { items: unknown[] }) {
  if (items.length === 0) {
    return <EmptyPreviewMessage>No list items parsed.</EmptyPreviewMessage>;
  }
  return (
    <ul className="grid gap-1.5 text-xs leading-5 text-slate-600">
      {items.map((item, index) => (
        <li className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-2" key={index}>
          <span className="mt-2 size-1.5 rounded-full bg-teal-500" />
          <span>{String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniChecklist({ items }: { items: unknown[] }) {
  if (items.length === 0) {
    return <EmptyPreviewMessage>No checklist items parsed.</EmptyPreviewMessage>;
  }
  return (
    <ol className="grid gap-1.5 text-xs leading-5 text-slate-600">
      {items.map((item, index) => (
        <li
          className="grid grid-cols-[1.35rem_minmax(0,1fr)] items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-1.5"
          key={index}
        >
          <span className="grid size-5 place-items-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span>{String(item)}</span>
        </li>
      ))}
    </ol>
  );
}

function MiniColumns({ columns }: { columns: unknown[] }) {
  if (columns.length === 0) {
    return <EmptyPreviewMessage>No columns parsed. Use two ## sections.</EmptyPreviewMessage>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {columns.slice(0, 2).map((column, index) => {
        const source = asRecord(column);
        return (
          <article
            className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-2"
            key={index}
          >
            <h4 className="mb-1 truncate text-xs font-semibold text-slate-900">
              {stringValue(source, "title") || `Column ${index + 1}`}
            </h4>
            <MiniList items={arrayValue(source, "items")} />
          </article>
        );
      })}
    </div>
  );
}

function MiniProgress({ done, doing }: { done: unknown[]; doing: unknown[] }) {
  const metrics = [...done, ...doing].slice(0, 4);
  if (metrics.length === 0) {
    return <EmptyPreviewMessage>No progress metrics parsed.</EmptyPreviewMessage>;
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {metrics.map((metric, index) => {
        const source = asRecord(metric);
        return (
          <div
            className="grid gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-2"
            key={index}
          >
            <small className="truncate text-[10px] text-slate-500">
              {stringValue(source, "label") || "Metric"}
            </small>
            <strong className="truncate text-sm text-orange-600">
              {String(source.value ?? 0)}%
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function MiniFlow({ steps }: { steps: unknown[] }) {
  if (steps.length === 0) {
    return <EmptyPreviewMessage>No flow steps parsed.</EmptyPreviewMessage>;
  }
  return (
    <ol className="grid gap-1.5">
      {steps.slice(0, 6).map((step, index) => (
        <li
          className="grid grid-cols-[1.6rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-600"
          key={index}
        >
          <strong className="text-[10px] text-teal-700">
            {String(index + 1).padStart(2, "0")}
          </strong>
          <span>{String(step)}</span>
        </li>
      ))}
    </ol>
  );
}

function EmptyPreviewMessage({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">
      {children}
    </p>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function ExportView({
  editorError,
  isBusy,
  onExportPdf,
  onPreviewDeck,
  status,
  task,
}: {
  editorError: string;
  isBusy: boolean;
  onExportPdf: () => void;
  onPreviewDeck: () => void;
  status: string;
  task: TaskFolderPayload;
}) {
  return (
    <section className="grid h-full min-h-0 grid-cols-2 grid-rows-[auto_minmax(0,1fr)] gap-2">
      <Pane>
        <PaneHeader
          title="Preview Deck"
          eyebrow="Full Slidev renderer"
          actions={
            <StatusPill tone={editorError ? "warn" : "ok"}>
              {editorError ? "fix slide first" : "ready"}
            </StatusPill>
          }
        />
        <div className="grid content-start gap-3 p-3">
          <Button
            type="button"
            className="justify-self-start"
            onClick={onPreviewDeck}
            disabled={isBusy || Boolean(editorError)}
          >
            <PresentationIcon />
            Preview Deck
          </Button>
          <p className="text-xs text-slate-500">{task.path}/output/slidev</p>
        </div>
      </Pane>
      <Pane>
        <PaneHeader
          title="Export PDF"
          eyebrow="output/slides.pdf"
          actions={<StatusPill>output/</StatusPill>}
        />
        <div className="grid content-start gap-3 p-3">
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={onExportPdf}
            disabled={isBusy || Boolean(editorError)}
          >
            <DownloadIcon />
            Export PDF
          </Button>
          <p className="text-xs text-slate-500">{task.path}/output/slides.pdf</p>
        </div>
      </Pane>
      <Pane className="col-span-2">
        <PaneHeader title="Build Status" eyebrow={task.name} />
        <pre className="m-3 min-h-28 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {status}
        </pre>
      </Pane>
    </section>
  );
}

export function WelcomeLauncher({
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
    <main className="relative grid h-screen grid-cols-[320px_minmax(0,1fr)] gap-2 overflow-hidden bg-slate-100 p-2 text-slate-950 [-webkit-app-region:drag]">
      <div
        className="absolute left-4 top-4 z-10 flex gap-2 [-webkit-app-region:no-drag]"
        aria-label="Window controls"
      >
        <button
          aria-label="Close"
          className="size-3 rounded-full bg-[#ff5f57]"
          onClick={() => void windowAction("close")}
          type="button"
        />
        <button
          aria-label="Minimize"
          className="size-3 rounded-full bg-[#ffbd2e]"
          onClick={() => void windowAction("minimize")}
          type="button"
        />
      </div>
      <section
        className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-5 rounded-xl bg-slate-950 p-5 pt-12 text-white [-webkit-app-region:drag]"
        aria-label="Project start"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-teal-300">SlideForge</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">Start a deck project</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Create or open a local project with project.yaml, slides, assets, and output.
          </p>
        </div>

        <div className="grid gap-2 [-webkit-app-region:no-drag]">
          <div className="grid gap-1">
            <Label className="text-xs font-semibold text-slate-300">New project name</Label>
            <Input
              autoFocus
              className="h-9 border-slate-600 bg-slate-900 text-white placeholder:text-slate-500"
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
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 bg-slate-900 text-white hover:bg-slate-800"
            onClick={openTaskFolder}
            disabled={isBusy}
          >
            <FolderOpenIcon />
            Open Project
          </Button>
        </div>

        <p
          className={
            statusTone === "warn"
              ? "self-end truncate text-xs text-rose-300"
              : "self-end truncate text-xs text-slate-300"
          }
        >
          {status}
        </p>
      </section>

      <section
        className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200 bg-white [-webkit-app-region:no-drag]"
        aria-label="Recent projects"
      >
        <header className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Recent Projects</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {vaultProjects.length} project{vaultProjects.length === 1 ? "" : "s"} in this
              workspace
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openTaskFolder}
            disabled={isBusy}
          >
            <FolderOpenIcon />
            Browse
          </Button>
        </header>

        <ScrollArea className="min-h-0">
          {availableProjects.length === 0 ? (
            <EmptyState title="No projects yet">
              Create a project folder or open an existing SlideForge project.
            </EmptyState>
          ) : (
            <div className="grid gap-1.5 p-3">
              {availableProjects.map((project) => (
                <button
                  className="grid gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/60"
                  disabled={isBusy}
                  key={project.path}
                  onClick={() => void openVaultProject(project)}
                  type="button"
                >
                  <strong className="truncate text-sm font-semibold text-slate-950">
                    {project.name}
                  </strong>
                  <span className="truncate text-xs text-slate-500">{project.path}</span>
                  <small className="truncate text-[11px] text-slate-400">
                    Last opened {project.lastOpenedAt}
                  </small>
                </button>
              ))}
            </div>
          )}

          {missingProjects.length > 0 ? (
            <section className="m-3 grid gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
              <h3 className="text-sm font-semibold text-rose-900">Missing folders</h3>
              {missingProjects.map((project) => (
                <div className="grid min-w-0 gap-1" key={project.path}>
                  <strong className="truncate text-xs text-rose-900">{project.name}</strong>
                  <span className="truncate text-xs text-rose-700">{project.path}</span>
                </div>
              ))}
            </section>
          ) : null}
        </ScrollArea>
      </section>
    </main>
  );
}
