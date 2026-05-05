import type { DeckAsset, DeckSlide, DeckSpec, RenderedSlidevProject } from "./types";

type ContentObject = Record<string, unknown>;
interface RenderContext {
  assets: DeckAsset[];
}

export function renderSlidev(spec: DeckSpec): RenderedSlidevProject {
  const context: RenderContext = {
    assets: spec.assets ?? [],
  };
  const slidesMd = [
    renderHeadmatter(spec),
    spec.slides.map((slide) => renderSlideWithNotes(slide, context)).join("\n\n---\n\n"),
  ].join("\n\n");

  return {
    files: [
      { path: "slides.md", content: slidesMd },
      { path: "style.css", content: renderStyleCss() },
    ],
  };
}

function renderHeadmatter(spec: DeckSpec): string {
  return [
    "---",
    "theme: seriph",
    `title: ${quoteYaml(spec.meta.title)}`,
    "transition: slide-left",
    "drawings:",
    "  persist: false",
    "mdc: true",
    "colorSchema: light",
    "---",
  ].join("\n");
}

function renderSlideWithNotes(slide: DeckSlide, context: RenderContext): string {
  const body = renderSlide(slide, context);
  if (!slide.speakerNotes) {
    return body;
  }

  return [body, "", "<!--", slide.speakerNotes, "-->"].join("\n");
}

function renderSlide(slide: DeckSlide, context: RenderContext): string {
  const rendered = (() => {
  switch (slide.type) {
    case "cover":
      return renderCover(slide);
    case "bullet_summary":
      return renderBulletSummary(slide);
    case "process":
      return renderProcess(slide);
    case "workflow":
      return renderWorkflow(slide);
    case "closing":
      return renderClosing(slide);
    case "section":
      return renderSection(slide);
    case "comparison":
    case "two_column":
      return renderTwoColumn(slide);
    case "metric_grid":
      return renderMetricGrid(slide);
    case "principle_card":
      return renderPrincipleCard(slide);
    case "code_explain":
      return renderCodeExplain(slide);
    case "trace_table":
      return renderTraceTable(slide);
    case "checklist":
      return renderChecklist(slide);
    case "note_callout":
      return renderNoteCallout(slide);
  }
  })();

  const visual = renderVisual(slide, context);
  return visual ? [rendered, "", visual].join("\n") : rendered;
}

function renderCover(slide: DeckSlide): string {
  const subtitle = stringField(slide.content, "subtitle");
  return [
    '<div class="slideforge-cover">',
    `<h1>${escapeHtml(slide.title)}</h1>`,
    subtitle ? `<p>${escapeHtml(subtitle)}</p>` : "",
    "</div>",
  ].join("\n");
}

function renderBulletSummary(slide: DeckSlide): string {
  const points = stringArrayField(slide.content, "points");
  return [
    `# ${slide.title}`,
    "",
    '<ul class="slideforge-points">',
    ...points.map((point) =>
      slide.animation?.preset === "step_reveal"
        ? `  <li v-click>${escapeHtml(point)}</li>`
        : `  <li>${escapeHtml(point)}</li>`,
    ),
    "</ul>",
  ].join("\n");
}

function renderProcess(slide: DeckSlide): string {
  const steps = stringArrayField(slide.content, "steps");
  return [
    `# ${slide.title}`,
    "",
    "<ol>",
    ...steps.map((step) =>
      slide.animation?.preset === "step_reveal"
        ? `  <li v-click>${escapeHtml(step)}</li>`
        : `  <li>${escapeHtml(step)}</li>`,
    ),
    "</ol>",
  ].join("\n");
}

function renderWorkflow(slide: DeckSlide): string {
  const steps = objectArrayField(slide.content, "steps");
  return [
    `# ${slide.title}`,
    "",
    '<div class="slideforge-workflow">',
    ...steps.map((step) =>
      [
        "  <div>",
        `    <strong>${escapeHtml(stringField(step, "label"))}</strong>`,
        `    <span>${escapeHtml(stringField(step, "body"))}</span>`,
        "  </div>",
      ].join("\n"),
    ),
    "</div>",
  ].join("\n");
}

function renderClosing(slide: DeckSlide): string {
  const statement = stringField(slide.content, "statement");
  return [
    '<div class="slideforge-cover">',
    `<h1>${escapeHtml(slide.title)}</h1>`,
    statement ? `<p>${escapeHtml(statement)}</p>` : "",
    "</div>",
  ].join("\n");
}

function renderSection(slide: DeckSlide): string {
  return [`# ${slide.title}`].join("\n");
}

function renderTwoColumn(slide: DeckSlide): string {
  const columns = objectArrayField(slide.content, "columns");
  return [
    `# ${slide.title}`,
    "",
    '<div class="slideforge-two-column">',
    ...columns.map((column) =>
      [
        "  <section>",
        `    <h2>${escapeHtml(stringField(column, "title"))}</h2>`,
        "    <ul>",
        ...stringArrayField(column, "items").map(
          (item) => `      <li>${escapeHtml(item)}</li>`,
        ),
        "    </ul>",
        "  </section>",
      ].join("\n"),
    ),
    "</div>",
  ].join("\n");
}

function renderMetricGrid(slide: DeckSlide): string {
  const metrics = objectArrayField(slide.content, "metrics");
  return [
    `# ${slide.title}`,
    "",
    '<div class="slideforge-metric-grid">',
    ...metrics.map((metric) =>
      [
        '  <section class="slideforge-metric">',
        `    <span>${escapeHtml(stringField(metric, "label"))}</span>`,
        `    <strong>${escapeHtml(stringField(metric, "value"))}</strong>`,
        `    <small>${escapeHtml(stringField(metric, "note"))}</small>`,
        "  </section>",
      ].join("\n"),
    ),
    "</div>",
  ].join("\n");
}

function renderPrincipleCard(slide: DeckSlide): string {
  const cards = objectArrayField(slide.content, "cards");
  return [
    `# ${slide.title}`,
    "",
    '<div class="slideforge-card-stack">',
    ...cards.map((card) =>
      [
        '  <section class="slideforge-principle-card">',
        `    <h2>${escapeHtml(stringField(card, "title"))}</h2>`,
        `    <p>${escapeHtml(stringField(card, "body"))}</p>`,
        "  </section>",
      ].join("\n"),
    ),
    "</div>",
  ].join("\n");
}

function renderCodeExplain(slide: DeckSlide): string {
  const language = stringField(slide.content, "language") || "text";
  const code = stringField(slide.content, "code");
  const note = stringField(slide.content, "note");
  const points = stringArrayField(slide.content, "points");

  return [
    `# ${slide.title}`,
    "",
    "```" + language,
    code,
    "```",
    points.length > 0
      ? [
          "",
          '<ul class="slideforge-points">',
          ...points.map((point) => `  <li>${escapeHtml(point)}</li>`),
          "</ul>",
        ].join("\n")
      : "",
    note ? renderNote(note) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderTraceTable(slide: DeckSlide): string {
  const columns = stringArrayField(slide.content, "columns");
  const rows = arrayField(slide.content, "rows");
  const note = stringField(slide.content, "note");

  return [
    `# ${slide.title}`,
    "",
    '<table class="slideforge-trace-table">',
    "  <thead>",
    "    <tr>",
    ...columns.map((column) => `      <th>${escapeHtml(column)}</th>`),
    "    </tr>",
    "  </thead>",
    "  <tbody>",
    ...rows.map((row) =>
      Array.isArray(row)
        ? [
            "    <tr>",
            ...row.map((cell) => `      <td>${escapeHtml(String(cell ?? ""))}</td>`),
            "    </tr>",
          ].join("\n")
        : "",
    ),
    "  </tbody>",
    "</table>",
    note ? renderNote(note) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderChecklist(slide: DeckSlide): string {
  const items = stringArrayField(slide.content, "items");
  return [
    `# ${slide.title}`,
    "",
    '<div class="slideforge-checklist">',
    ...items.map(
      (item) =>
        `  <label><input type="checkbox" /> <span>${escapeHtml(item)}</span></label>`,
    ),
    "</div>",
  ].join("\n");
}

function renderNoteCallout(slide: DeckSlide): string {
  return [`# ${slide.title}`, "", renderNote(stringField(slide.content, "body"))].join(
    "\n",
  );
}

function renderNote(value: string): string {
  return `<div class="slideforge-note">${escapeHtml(value)}</div>`;
}

function renderVisual(slide: DeckSlide, context: RenderContext): string {
  if (!slide.visual) {
    return "";
  }

  const asset = context.assets.find((item) => item.id === slide.visual?.assetId);
  if (!asset || asset.kind !== "image") {
    return "";
  }

  const src = normalizeAssetSrc(asset.path);
  const alt = slide.visual.alt || asset.description || slide.title;
  return [
    '<figure class="slideforge-visual">',
    `  <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`,
    alt ? `  <figcaption>${escapeHtml(alt)}</figcaption>` : "",
    "</figure>",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAssetSrc(path: string): string {
  return path.startsWith("./") ? path : `./${path}`;
}

function renderStyleCss(): string {
  return [
    ":root {",
    "  --slideforge-accent: #0f766e;",
    "  --slideforge-accent-soft: #e1f3ef;",
    "  --slideforge-warn: #b42318;",
    "  --slideforge-ink: #18202a;",
    "  --slideforge-muted: #5e6a75;",
    "  --slideforge-line: #d7dde3;",
    "  --slideforge-surface: #f6f8fa;",
    "}",
    "",
    ".slidev-layout {",
    "  position: relative;",
    "  overflow: hidden;",
    "  background: #fbfcfc;",
    "  color: var(--slideforge-ink);",
    "  font-size: 1.05rem;",
    "  letter-spacing: 0;",
    "  padding: 3.2rem 4rem 3rem;",
    "}",
    "",
    ".slidev-layout::after {",
    "  position: absolute;",
    "  right: 2.2rem;",
    "  bottom: 1.5rem;",
    "  color: #8aa29f;",
    "  content: 'SLIDEFORGE TEACHING';",
    "  font-size: 0.58rem;",
    "  font-weight: 700;",
    "  letter-spacing: 0.08em;",
    "}",
    "",
    ".slidev-layout h1,",
    ".slidev-layout h2,",
    ".slidev-layout h3 {",
    "  color: var(--slideforge-ink);",
    "  letter-spacing: 0;",
    "}",
    "",
    ".slidev-layout > h1:first-child {",
    "  display: grid;",
    "  grid-template-columns: 0.42rem minmax(0, 1fr);",
    "  gap: 0.85rem;",
    "  align-items: center;",
    "  margin-bottom: 1.6rem;",
    "  font-size: 2.15rem;",
    "  line-height: 1.15;",
    "}",
    "",
    ".slidev-layout > h1:first-child::before {",
    "  display: block;",
    "  width: 0.42rem;",
    "  height: 2.3rem;",
    "  border-radius: 999px;",
    "  background: var(--slideforge-accent);",
    "  content: '';",
    "}",
    "",
    ".slidev-layout p,",
    ".slidev-layout li {",
    "  color: var(--slideforge-muted);",
    "}",
    "",
    ".slideforge-cover {",
    "  display: grid;",
    "  min-height: 70%;",
    "  place-content: center;",
    "  text-align: center;",
    "  border: 1px solid var(--slideforge-line);",
    "  border-radius: 10px;",
    "  background: linear-gradient(135deg, #ffffff 0%, #eef8f6 100%);",
    "  padding: 3rem;",
    "}",
    "",
    ".slideforge-cover h1 {",
    "  font-size: 3.4rem;",
    "}",
    "",
    ".slideforge-cover p {",
    "  margin-top: 1rem;",
    "  font-size: 1.35rem;",
    "}",
    "",
    ".slideforge-points li {",
    "  margin: 0.55rem 0;",
    "}",
    "",
    ".slideforge-two-column,",
    ".slideforge-metric-grid {",
    "  display: grid;",
    "  grid-template-columns: repeat(2, minmax(0, 1fr));",
    "  gap: 1.5rem;",
    "  margin-top: 1.5rem;",
    "}",
    "",
    ".slideforge-metric-grid {",
    "  grid-template-columns: repeat(3, minmax(0, 1fr));",
    "}",
    "",
    ".slideforge-two-column section,",
    ".slideforge-metric,",
    ".slideforge-principle-card {",
    "  border: 1px solid var(--slideforge-line);",
    "  border-radius: 8px;",
    "  background: #fff;",
    "}",
    "",
    ".slideforge-two-column section {",
    "  padding: 1rem 1.2rem;",
    "}",
    "",
    ".slideforge-metric {",
    "  display: grid;",
    "  gap: 0.25rem;",
    "  min-height: 8.5rem;",
    "  padding: 1rem;",
    "}",
    "",
    ".slideforge-metric span,",
    ".slideforge-metric small {",
    "  color: var(--slideforge-muted);",
    "}",
    "",
    ".slideforge-metric strong {",
    "  align-self: center;",
    "  color: var(--slideforge-warn);",
    "  font-size: 2rem;",
    "  line-height: 1;",
    "}",
    "",
    ".slideforge-card-stack {",
    "  display: grid;",
    "  gap: 1rem;",
    "  margin-top: 1.5rem;",
    "}",
    "",
    ".slideforge-principle-card {",
    "  padding: 1.1rem 1.25rem;",
    "}",
    "",
    ".slideforge-principle-card h2 {",
    "  margin: 0;",
    "  color: var(--slideforge-accent);",
    "  font-size: 1.2rem;",
    "}",
    "",
    ".slideforge-principle-card p {",
    "  margin: 0.5rem 0 0;",
    "  line-height: 1.6;",
    "}",
    "",
    ".slideforge-workflow {",
    "  display: grid;",
    "  gap: 0.75rem;",
    "  margin-top: 2rem;",
    "}",
    "",
    ".slideforge-workflow div {",
    "  display: grid;",
    "  grid-template-columns: 10rem 1fr;",
    "  gap: 1.5rem;",
    "  align-items: center;",
    "  border-left: 4px solid var(--slideforge-accent);",
    "  background: var(--slideforge-surface);",
    "  padding: 0.8rem 1rem;",
    "}",
    "",
    ".slideforge-workflow strong {",
    "  color: var(--slideforge-ink);",
    "}",
    "",
    ".slideforge-trace-table {",
    "  width: 100%;",
    "  margin-top: 1.25rem;",
    "  border-collapse: collapse;",
    "  font-size: 0.82rem;",
    "}",
    "",
    ".slideforge-trace-table th,",
    ".slideforge-trace-table td {",
    "  border: 1px solid var(--slideforge-line);",
    "  padding: 0.45rem 0.55rem;",
    "  vertical-align: top;",
    "}",
    "",
    ".slideforge-trace-table th {",
    "  background: var(--slideforge-surface);",
    "  color: var(--slideforge-ink);",
    "}",
    "",
    ".slideforge-note {",
    "  margin-top: 1.25rem;",
    "  border-left: 4px solid var(--slideforge-accent);",
    "  color: var(--slideforge-muted);",
    "  padding-left: 1rem;",
    "}",
    "",
    ".slideforge-visual {",
    "  margin: 1.25rem 0 0;",
    "}",
    "",
    ".slideforge-visual img {",
    "  display: block;",
    "  max-width: 100%;",
    "  max-height: 15rem;",
    "  object-fit: contain;",
    "  border: 1px solid var(--slideforge-line);",
    "  border-radius: 8px;",
    "  background: #fff;",
    "}",
    "",
    ".slideforge-visual figcaption {",
    "  margin-top: 0.4rem;",
    "  color: var(--slideforge-muted);",
    "  font-size: 0.78rem;",
    "}",
    "",
    ".slideforge-checklist {",
    "  display: grid;",
    "  gap: 0.9rem;",
    "  margin-top: 2rem;",
    "}",
    "",
    ".slideforge-checklist label {",
    "  display: flex;",
    "  gap: 0.75rem;",
    "  align-items: center;",
    "  color: var(--slideforge-ink);",
    "}",
    "",
    ".slideforge-checklist input {",
    "  width: 1.1rem;",
    "  height: 1.1rem;",
    "  accent-color: var(--slideforge-accent);",
    "}",
  ].join("\n");
}

function stringField(content: ContentObject, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function arrayField(content: ContentObject, key: string): unknown[] {
  const value = content[key];
  return Array.isArray(value) ? value : [];
}

function stringArrayField(content: ContentObject, key: string): string[] {
  return arrayField(content, key).filter((item): item is string => {
    return typeof item === "string";
  });
}

function objectArrayField(content: ContentObject, key: string): ContentObject[] {
  return arrayField(content, key).filter((item): item is ContentObject => {
    return typeof item === "object" && item !== null && !Array.isArray(item);
  });
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
