export type AnimationPreset = "none" | "step_reveal" | "highlight_key_points";

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

export interface DeckSpec {
  meta: {
    title: string;
    language: string;
    theme: string;
    template?: "teaching" | "clean";
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
    preset?: AnimationPreset;
  };
}

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

export interface LayoutDefinition {
  id: LayoutId;
  name: string;
  category: LayoutCategory;
  description: string;
  propsSchema: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  vueFile: string;
  vueSource: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface RenderedSlidevProject {
  files: Array<{
    path: string;
    content: string;
  }>;
}
