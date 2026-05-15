export const MAX_TEXT_ASSET_BYTES = 48_000;

export const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yaml",
  ".yml",
]);

export const SLIDE_TYPES = new Set([
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
]);

export const LAYOUT_IDS = new Set([
  "title-cover",
  "section-divider",
  "bullet-list",
  "two-column",
  "image-left-text-right",
  "progress-dashboard",
  "system-flow",
  "quote-callout",
  "code-walkthrough",
  "exercise-checklist",
  "lab-progress",
  "research-system-concept",
]);

export const TEMPLATE_IDS = new Set(["teaching", "clean"]);

export const DEFAULT_TEMPLATE = "teaching";

export const DEFAULT_THEME = "lecture-light";
