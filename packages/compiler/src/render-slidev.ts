import yaml from "js-yaml";
import { builtinLayouts, defaultLayoutForSlideType, getLayoutDefinition } from "./layouts";
import type {
  DeckAsset,
  DeckSlide,
  DeckSpec,
  LayoutDefinition,
  LayoutId,
  RenderedSlidevProject,
  ThemeTokens,
} from "./types";

type SlideFrontmatter = Record<string, unknown>;

export function renderSlidev(spec: DeckSpec): RenderedSlidevProject {
  const assetsById = new Map((spec.assets ?? []).map((asset) => [asset.id, asset]));
  const normalizedSlides = spec.slides.map((slide) => normalizeSlide(slide, assetsById));
  const usedLayouts = usedLayoutDefinitions(normalizedSlides);
  const slidesMd = [
    renderHeadmatter(spec),
    normalizedSlides.map(renderSlidePage).join("\n\n---\n\n"),
  ].join("\n\n");

  return {
    files: [
      { path: "slides.md", content: slidesMd },
      { path: "style.css", content: renderStyleCss(spec) },
      ...usedLayouts.map((layout) => ({
        path: `layouts/${layout.vueFile}`,
        content: layout.vueSource,
      })),
    ],
  };
}

function renderHeadmatter(spec: DeckSpec): string {
  return frontmatter({
    theme: "seriph",
    title: spec.meta.title,
    transition: "slide-left",
    drawings: { persist: false },
    mdc: true,
    colorSchema: "light",
    class: `slideforge-${spec.meta.template ?? "layout"} slideforge-${themeId(spec)}`,
  });
}

function renderSlidePage(slide: DeckSlide): string {
  const page = frontmatter(slideFrontmatter(slide));
  if (!slide.speakerNotes) {
    return page;
  }
  return [page, "", "<!--", slide.speakerNotes, "-->"].join("\n");
}

function slideFrontmatter(slide: DeckSlide): SlideFrontmatter {
  const props = normalizeAssetProps({
    ...slide.props,
    title: slide.title,
  });
  return {
    layout: slide.layout,
    id: slide.id,
    ...props,
  };
}

function normalizeSlide(slide: DeckSlide, assetsById: Map<string, DeckAsset>): DeckSlide {
  const layout = slide.layout || defaultLayoutForSlideType(slide.type);
  const props = slide.props ?? legacyProps(slide, assetsById);
  return {
    ...slide,
    layout,
    props,
  };
}

function legacyProps(
  slide: DeckSlide,
  assetsById: Map<string, DeckAsset>,
): Record<string, unknown> {
  const content = slide.content ?? {};
  switch (slide.type) {
    case "cover":
      return {
        subtitle: stringField(content, "subtitle"),
        image: visualAssetPath(slide, assetsById),
        alt: slide.visual?.alt,
      };
    case "section":
      return {
        lead: stringField(content, "lead"),
      };
    case "bullet_summary":
      return {
        points: arrayField(content, "points"),
        image: visualAssetPath(slide, assetsById),
        alt: slide.visual?.alt,
      };
    case "process":
      return {
        points: arrayField(content, "steps"),
      };
    case "workflow":
      return {
        steps: objectArrayField(content, "steps").map((step) =>
          [stringField(step, "label"), stringField(step, "body")].filter(Boolean).join(": "),
        ),
      };
    case "code_explain":
      return {
        language: stringField(content, "language") || "text",
        code: stringField(content, "code"),
        note: stringField(content, "note"),
        points: arrayField(content, "points"),
      };
    case "trace_table":
      return {
        steps: arrayField(content, "rows").map((row) =>
          Array.isArray(row)
            ? row.map((cell) => String(cell ?? "")).join(" / ")
            : String(row ?? ""),
        ),
        sideTitle: "Columns",
        sideItems: arrayField(content, "columns"),
        note: stringField(content, "note"),
      };
    case "checklist":
      return {
        items: arrayField(content, "items"),
      };
    case "comparison":
    case "two_column":
      return {
        columns: objectArrayField(content, "columns"),
      };
    case "metric_grid":
      return {
        points: objectArrayField(content, "metrics").map((metric) =>
          [stringField(metric, "label"), stringField(metric, "value"), stringField(metric, "note")]
            .filter(Boolean)
            .join(" - "),
        ),
      };
    case "principle_card":
      return {
        points: objectArrayField(content, "cards").map((card) =>
          [stringField(card, "title"), stringField(card, "body")].filter(Boolean).join(": "),
        ),
      };
    case "note_callout":
      return {
        quote: stringField(content, "body"),
      };
    case "closing":
      return {
        quote: stringField(content, "statement"),
      };
    default:
      return content;
  }
}

function visualAssetPath(slide: DeckSlide, assetsById: Map<string, DeckAsset>): string {
  const assetId = slide.visual?.assetId;
  return assetId ? (assetsById.get(assetId)?.path ?? "") : "";
}

function usedLayoutDefinitions(slides: DeckSlide[]): LayoutDefinition[] {
  const usedIds = new Set<LayoutId>();
  for (const slide of slides) {
    usedIds.add(getLayoutDefinition(slide.layout).id);
  }
  return builtinLayouts.filter((layout) => usedIds.has(layout.id));
}

function normalizeAssetProps(value: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...value };
  for (const key of ["image", "logo"]) {
    if (typeof normalized[key] === "string") {
      normalized[key] = normalizeAssetPath(normalized[key]);
    }
  }
  return normalized;
}

function normalizeAssetPath(value: string): string {
  if (!value || /^(https?:|file:|data:|\/)/.test(value)) {
    return value;
  }
  return value;
}

function frontmatter(value: Record<string, unknown>): string {
  return ["---", yaml.dump(value, { lineWidth: 100, noRefs: true }).trim(), "---"].join("\n");
}

function themeId(spec: DeckSpec): string {
  return spec.theme?.id || spec.meta.theme || "lecture-light";
}

function themeTokens(spec: DeckSpec): Required<ThemeTokens> {
  const id = themeId(spec);
  const clean = id === "clean-light" || spec.meta.template === "clean";
  return {
    id,
    accent: spec.theme?.accent || (clean ? "#2563eb" : "#0f766e"),
    background: spec.theme?.background || "#ffffff",
    text: spec.theme?.text || "#111827",
    muted: spec.theme?.muted || "#5e6a75",
    logo: spec.theme?.logo || "",
    footer: spec.theme?.footer || (clean ? "SLIDEFORGE CLEAN" : "SLIDEFORGE"),
    fontFamily:
      spec.theme?.fontFamily ||
      "Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  };
}

function renderStyleCss(spec: DeckSpec): string {
  const theme = themeTokens(spec);
  return [
    ":root {",
    `  --sf-accent: ${theme.accent};`,
    `  --sf-background: ${theme.background};`,
    `  --sf-text: ${theme.text};`,
    `  --sf-muted: ${theme.muted};`,
    "  --sf-line: color-mix(in srgb, var(--sf-accent) 26%, #d7dde3);",
    "  --sf-soft: color-mix(in srgb, var(--sf-accent) 10%, #ffffff);",
    `  --sf-font: ${theme.fontFamily};`,
    "}",
    "",
    ".slidev-layout {",
    "  overflow: hidden;",
    "  padding: 0;",
    "  background: var(--sf-background);",
    "  color: var(--sf-text);",
    "  font-family: var(--sf-font);",
    "  letter-spacing: 0;",
    "}",
    "",
    ".sf-slide {",
    "  position: relative;",
    "  display: grid;",
    "  width: 100%;",
    "  height: 100%;",
    "  overflow: hidden;",
    "  padding: 3rem 3.4rem 2.7rem;",
    "  background: var(--sf-background);",
    "  color: var(--sf-text);",
    "}",
    "",
    `.sf-slide::after { content: '${escapeCssContent(theme.footer)}'; position: absolute; right: 2rem; bottom: 1.2rem; color: var(--sf-muted); font-size: 0.65rem; font-weight: 700; }`,
    "",
    ".sf-header { display: grid; gap: 0.35rem; align-content: start; }",
    ".sf-kicker { margin: 0; color: var(--sf-accent); font-size: 0.78rem; font-weight: 800; text-transform: uppercase; }",
    ".sf-header h1, .sf-cover h1, .sf-section h1, .sf-quote h1 { margin: 0; color: var(--sf-text); font-size: 2.25rem; line-height: 1.12; letter-spacing: 0; }",
    ".sf-lead, .sf-cover-subtitle { margin: 0; color: var(--sf-muted); font-size: 1.2rem; line-height: 1.45; }",
    "",
    ".sf-standard { grid-template-rows: auto minmax(0, 1fr) auto; gap: 1.6rem; }",
    ".sf-cover { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 2.4rem; align-items: center; background: linear-gradient(135deg, var(--sf-background), var(--sf-soft)); }",
    ".sf-cover-copy { display: grid; gap: 0.8rem; align-content: center; }",
    ".sf-cover h1 { font-size: 3.4rem; }",
    ".sf-cover-image, .sf-image-frame img { max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid var(--sf-line); border-radius: 8px; }",
    ".sf-section, .sf-quote { place-content: center; gap: 1rem; text-align: center; background: linear-gradient(135deg, var(--sf-background), var(--sf-soft)); }",
    ".sf-section h1, .sf-quote h1 { font-size: 3rem; }",
    ".sf-quote blockquote { max-width: 48rem; margin: 0; color: var(--sf-text); font-size: 2rem; line-height: 1.3; }",
    "",
    ".sf-bullet-list { display: grid; gap: 0.9rem; margin: 0; padding: 0; list-style: none; font-size: 1.4rem; }",
    ".sf-bullet-list li { display: grid; grid-template-columns: 0.8rem minmax(0, 1fr); gap: 0.85rem; align-items: start; color: var(--sf-muted); line-height: 1.4; }",
    ".sf-bullet-list li::before { width: 0.55rem; height: 0.55rem; margin-top: 0.55rem; border-radius: 99px; background: var(--sf-accent); content: ''; }",
    "",
    ".sf-two-column, .sf-image-text, .sf-system-grid, .sf-code-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.4rem; min-height: 0; }",
    ".sf-panel, .sf-flow-panel, .sf-image-frame { min-height: 0; border: 1px solid var(--sf-line); border-radius: 8px; background: #fff; padding: 1.1rem; }",
    ".sf-panel h2, .sf-flow-panel h2 { margin: 0 0 0.75rem; color: var(--sf-accent); font-size: 1.25rem; }",
    ".sf-panel p, .sf-panel li { color: var(--sf-muted); font-size: 1rem; line-height: 1.45; }",
    "",
    ".sf-image-frame { display: grid; place-items: center; gap: 0.5rem; }",
    ".sf-image-frame figcaption { color: var(--sf-muted); font-size: 0.78rem; }",
    "",
    ".sf-dashboard-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; min-height: 0; }",
    ".sf-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.55rem; align-items: center; margin: 0.55rem 0; }",
    ".sf-progress-row span { overflow: hidden; color: var(--sf-muted); text-overflow: ellipsis; white-space: nowrap; }",
    ".sf-progress-row strong { color: var(--sf-accent); }",
    ".sf-meter { grid-column: 1 / -1; height: 0.45rem; overflow: hidden; border-radius: 99px; background: var(--sf-soft); }",
    ".sf-meter i { display: block; height: 100%; border-radius: inherit; background: var(--sf-accent); }",
    ".sf-problem h2 { color: #b42318; }",
    "",
    ".sf-flow-stack { display: grid; justify-items: center; gap: 0.45rem; }",
    ".sf-flow-step { width: min(24rem, 100%); border: 1px solid var(--sf-line); border-radius: 8px; background: var(--sf-soft); padding: 0.65rem 0.9rem; text-align: center; font-weight: 700; }",
    ".sf-flow-stack span { color: var(--sf-accent); font-weight: 900; }",
    ".sf-note { margin: 0; border-left: 4px solid var(--sf-accent); padding-left: 1rem; color: var(--sf-muted); }",
    "",
    ".sf-code-grid { grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr); }",
    ".sf-code-slide pre { overflow: auto; margin: 0; border: 1px solid var(--sf-line); border-radius: 8px; background: #111827; padding: 1rem; color: #f8fafc; font-size: 0.92rem; line-height: 1.45; }",
    ".sf-checklist { display: grid; gap: 0.8rem; align-content: start; }",
    ".sf-checklist label { display: grid; grid-template-columns: 2.2rem minmax(0, 1fr); gap: 0.8rem; align-items: center; border: 1px solid var(--sf-line); border-radius: 8px; padding: 0.8rem 1rem; }",
    ".sf-checklist span { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 99px; background: var(--sf-accent); color: #fff; font-weight: 800; }",
  ].join("\n");
}

function stringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function arrayField(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

function objectArrayField(source: Record<string, unknown>, key: string): Record<string, unknown>[] {
  return arrayField(source, key).filter(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  );
}

function escapeCssContent(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
