import type { Root } from "react-dom/client";

export type SlideType =
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

export type TemplateId = "teaching" | "clean";
export type ThemeId = "lecture-light" | "clean-light";
export type LayoutCategory = "basic" | "teaching" | "research" | "lab";
export type LayoutId =
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

export interface DeckSpec {
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

export interface ThemeTokens {
  id?: string;
  accent?: string;
  background?: string;
  text?: string;
  muted?: string;
  logo?: string;
  footer?: string;
  fontFamily?: string;
}

export interface DeckAsset {
  id: string;
  path: string;
  kind: "image" | "text";
  description?: string;
}

export interface VisualRef {
  assetId: string;
  alt?: string;
  role?: "primary" | "supporting";
}

export interface DeckSlide {
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

export interface LayoutDefinition {
  id: LayoutId;
  name: string;
  category: LayoutCategory;
  description: string;
  defaultProps: Record<string, unknown>;
}

export interface LayoutContract {
  layout: LayoutId;
  title: string;
  summary: string;
  help: string[];
  exampleBody: string;
}

export interface ReferencedAssetContent {
  assetId: string;
  path: string;
  kind: "image" | "text";
  text?: string;
}

export interface EnvStatus {
  hasKey: boolean;
  hasModel: boolean;
  message: string;
}

export interface ProjectConfig {
  title: string;
  language: string;
  template: TemplateId;
  theme: ThemeId;
}

export interface SlideFrontmatter {
  id: string;
  layout: LayoutId | string;
  title: string;
  props?: Record<string, unknown>;
  speakerNotes?: string;
}

export interface SlideFile {
  fileName: string;
  path: string;
  markdown: string;
  frontmatter: SlideFrontmatter;
  body: string;
  slide: DeckSlide;
}

export interface TaskFolderPayload {
  path: string;
  name: string;
  projectConfig: ProjectConfig;
  slides: SlideFile[];
  deck: DeckSpec;
  assets: DeckAsset[];
  referencedAssets: ReferencedAssetContent[];
  missingAssetRefs: string[];
  envStatus: EnvStatus;
}

export interface GenerateDeckResult {
  deck: DeckSpec;
  validationErrors: string[];
  repaired: boolean;
  rawSummary: string;
}

export interface BuildDeckResult {
  slidevDir: string;
  pdfPath?: string | null;
  url?: string;
  warnings: string[];
  log: string;
}

export interface VaultProject {
  name: string;
  path: string;
  lastOpenedAt: string;
  exists: boolean;
}

export interface VaultPayload {
  projects: VaultProject[];
}

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
