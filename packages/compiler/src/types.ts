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
    template?: "teaching";
  };
  assets?: DeckAsset[];
  slides: DeckSlide[];
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
  type: SlideType;
  title: string;
  content: Record<string, unknown>;
  visual?: VisualRef;
  speakerNotes?: string;
  animation?: {
    preset?: AnimationPreset;
  };
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
