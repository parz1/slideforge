import { useEffect, useState } from "react";
import { arrayValue, objectString, slideLayoutId, slideProps, stringValue } from "@/deck-model";
import type { DeckSlide } from "@/types";

export function ActiveSlidePreviewApp() {
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
    <main className="grid min-h-screen place-items-center overflow-hidden bg-slate-100 p-6">
      {slide ? (
        <SlidePreviewStage slide={slide} />
      ) : (
        <section className="grid aspect-video w-full max-w-5xl place-content-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <h1 className="text-4xl font-semibold text-slate-950">Slide Preview</h1>
          <p className="mt-3 text-sm text-slate-500">Select a slide in the main window.</p>
        </section>
      )}
    </main>
  );
}

export function writePreviewWindow(target: Window, slide: DeckSlide) {
  target.document.open();
  target.document.write(renderPreviewDocument(slide));
  target.document.close();
}

export async function openDesktopActivePreview(slide: DeckSlide): Promise<boolean> {
  return window.slideforge?.openActivePreview(slide).catch(() => false) ?? false;
}

export async function emitActiveSlideToDesktopPreview(slide: DeckSlide): Promise<void> {
  if (!window.slideforge) {
    return;
  }
  await window.slideforge.updateActivePreview(slide).catch(() => undefined);
}

function SlidePreviewStage({ slide }: { slide: DeckSlide }) {
  const layout = slideLayoutId(slide);
  return (
    <section className="aspect-video w-full max-w-5xl overflow-auto rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-600">{layout}</p>
      <h1 className="mb-8 text-5xl font-semibold leading-tight text-slate-950">{slide.title}</h1>
      <ActivePreviewBody slide={slide} />
    </section>
  );
}

function ActivePreviewBody({ slide }: { slide: DeckSlide }) {
  const layout = slideLayoutId(slide);
  const props = slideProps(slide);
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...arrayValue(props, "done"), ...arrayValue(props, "doing")]
          .slice(0, 6)
          .map((metric, index) => (
            <article
              className="grid min-h-28 gap-2 rounded-lg border border-slate-200 p-4"
              key={index}
            >
              <span className="text-sm text-slate-500">{objectString(metric, "label")}</span>
              <strong className="self-center text-3xl text-orange-600">
                {objectString(metric, "value")}%
              </strong>
            </article>
          ))}
      </div>
    );
  }

  if (layout === "quote-callout") {
    return (
      <p className="border-l-4 border-teal-600 pl-4 text-2xl leading-relaxed text-slate-600">
        {stringValue(props, "quote") ||
          stringValue(props, "statement") ||
          stringValue(props, "body")}
      </p>
    );
  }

  if (layout === "code-walkthrough") {
    return (
      <>
        <pre className="overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-base text-slate-50">
          <code>{stringValue(props, "code")}</code>
        </pre>
        {stringValue(props, "note") ? (
          <p className="mt-4 border-l-4 border-teal-600 pl-4 text-slate-600">
            {stringValue(props, "note")}
          </p>
        ) : null}
      </>
    );
  }

  if (layout === "system-flow" || layout === "research-system-concept") {
    return (
      <div className="grid gap-3">
        {arrayValue(props, "steps").map((step, index) => (
          <article
            className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4 rounded-lg border border-l-4 border-slate-200 border-l-teal-600 bg-slate-50 p-4"
            key={index}
          >
            <strong className="text-slate-950">{String(index + 1).padStart(2, "0")}</strong>
            <span className="text-slate-600">{String(step)}</span>
          </article>
        ))}
      </div>
    );
  }

  if (layout === "exercise-checklist") {
    return <ActiveList items={arrayValue(props, "items")} />;
  }

  if (layout === "bullet-list") {
    return (
      <ActiveList
        items={
          arrayValue(props, "points").length
            ? arrayValue(props, "points")
            : arrayValue(props, "items")
        }
      />
    );
  }

  if (layout === "two-column") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {arrayValue(props, "columns").map((column, index) => (
          <article className="rounded-lg border border-slate-200 p-4" key={index}>
            <h2 className="mb-3 text-xl font-semibold text-teal-700">
              {objectString(column, "title")}
            </h2>
            <ActiveList items={arrayValue(column as Record<string, unknown>, "items")} />
          </article>
        ))}
      </div>
    );
  }

  if (layout === "title-cover" || layout === "section-divider") {
    return (
      <p className="text-2xl text-slate-500">
        {stringValue(props, "subtitle") || stringValue(props, "lead")}
      </p>
    );
  }

  return null;
}

function ActiveList({ items }: { items: unknown[] }) {
  return (
    <ul className="grid gap-3 pl-5 text-xl leading-relaxed text-slate-600">
      {items.map((item, index) => (
        <li key={index}>{String(item)}</li>
      ))}
    </ul>
  );
}

function renderPreviewDocument(slide: DeckSlide): string {
  const layout = slideLayoutId(slide);
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
    `<section class="slide ${escapeHtml(layout)}">`,
    `<p class="slide-type">${escapeHtml(layout)}</p>`,
    `<h1>${escapeHtml(slide.title)}</h1>`,
    renderPreviewWindowBody(slide),
    "</section>",
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderPreviewWindowBody(slide: DeckSlide): string {
  const layout = slideLayoutId(slide);
  const props = slideProps(slide);
  if (layout === "title-cover") {
    return `<p class="cover-subtitle">${escapeHtml(stringValue(props, "subtitle"))}</p>`;
  }
  if (layout === "quote-callout") {
    return `<p class="note">${escapeHtml(stringValue(props, "quote") || stringValue(props, "statement") || stringValue(props, "body"))}</p>`;
  }
  if (layout === "progress-dashboard" || layout === "lab-progress") {
    return [
      '<div class="metric-grid">',
      ...[...arrayValue(props, "done"), ...arrayValue(props, "doing")]
        .slice(0, 6)
        .map(
          (metric) =>
            `<article><span>${escapeHtml(objectString(metric, "label"))}</span><strong>${escapeHtml(objectString(metric, "value"))}%</strong></article>`,
        ),
      "</div>",
    ].join("\n");
  }
  if (layout === "code-walkthrough") {
    return [
      `<pre><code>${escapeHtml(stringValue(props, "code"))}</code></pre>`,
      stringValue(props, "note")
        ? `<p class="note">${escapeHtml(stringValue(props, "note"))}</p>`
        : "",
    ].join("\n");
  }
  if (layout === "system-flow" || layout === "research-system-concept") {
    return [
      '<div class="workflow-list">',
      ...arrayValue(props, "steps").map(
        (step, index) =>
          `<article><strong>${String(index + 1).padStart(2, "0")}</strong><span>${escapeHtml(String(step))}</span></article>`,
      ),
      "</div>",
    ].join("\n");
  }
  if (layout === "exercise-checklist") {
    return renderPreviewList(props, "items");
  }
  if (layout === "two-column") {
    return [
      '<div class="columns">',
      ...arrayValue(props, "columns").map(
        (column) =>
          `<article><h2>${escapeHtml(objectString(column, "title"))}</h2><ul>${arrayValue(
            column as Record<string, unknown>,
            "items",
          )
            .map((item) => `<li>${escapeHtml(String(item))}</li>`)
            .join("")}</ul></article>`,
      ),
      "</div>",
    ].join("\n");
  }
  return renderPreviewList(props, "points");
}

function renderPreviewList(content: Record<string, unknown>, key: string): string {
  return [
    '<ul class="checklist">',
    ...arrayValue(content, key).map((item) => `<li>${escapeHtml(String(item))}</li>`),
    "</ul>",
  ].join("\n");
}

function renderPreviewWindowCss(): string {
  return `
    :root {
      color: #0f172a;
      background: #f1f5f9;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .preview-stage { display: grid; min-height: 100vh; place-items: center; padding: 24px; }
    .slide { width: min(1120px, 100%); aspect-ratio: 16 / 9; overflow: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 48px 56px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12); }
    .slide-type { margin: 0 0 10px; color: #0d9488; font-size: 13px; font-weight: 750; text-transform: uppercase; }
    h1 { margin: 0 0 28px; font-size: 42px; line-height: 1.12; letter-spacing: 0; }
    h2 { margin: 0 0 10px; color: #0f766e; font-size: 22px; letter-spacing: 0; }
    p, li, td, small, span { color: #475569; line-height: 1.55; }
    .cover, .closing { display: grid; place-content: center; text-align: center; }
    .cover h1, .closing h1 { margin-bottom: 14px; font-size: 56px; }
    .cover-subtitle { margin: 0; font-size: 24px; }
    .metric-grid, .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    article { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 18px; }
    .metric-grid article { display: grid; min-height: 128px; gap: 6px; }
    .metric-grid strong { align-self: center; color: #ea580c; font-size: 34px; line-height: 1; }
    .workflow-list { display: grid; gap: 14px; }
    .workflow-list article { display: grid; grid-template-columns: 140px 1fr; gap: 20px; border-left: 5px solid #0d9488; background: #f8fafc; }
    pre { overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #0f172a; padding: 18px; color: #f8fafc; font-size: 18px; line-height: 1.45; }
    .note { margin-top: 18px; border-left: 5px solid #0d9488; padding-left: 16px; }
    .checklist { display: grid; gap: 14px; margin: 0; padding-left: 22px; font-size: 22px; }
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
