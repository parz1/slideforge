import type { LayoutDefinition, LayoutId, SlideType } from "./types";

const basePropsSchema = {
  type: "object",
  additionalProperties: true,
};

export const builtinLayouts: LayoutDefinition[] = [
  {
    id: "title-cover",
    name: "Title Cover",
    category: "basic",
    description: "Title, subtitle, optional kicker and background image.",
    propsSchema: basePropsSchema,
    defaultProps: { subtitle: "Subtitle", kicker: "" },
    vueFile: "title-cover.vue",
    vueSource: vueLayout("title-cover", titleCoverTemplate()),
  },
  {
    id: "section-divider",
    name: "Section Divider",
    category: "basic",
    description: "Large section title and optional lead.",
    propsSchema: basePropsSchema,
    defaultProps: { lead: "Short section lead" },
    vueFile: "section-divider.vue",
    vueSource: vueLayout("section-divider", sectionDividerTemplate()),
  },
  {
    id: "bullet-list",
    name: "Bullet List",
    category: "basic",
    description: "Simple list slide for 3-6 points.",
    propsSchema: basePropsSchema,
    defaultProps: { points: ["First point", "Second point", "Third point"] },
    vueFile: "bullet-list.vue",
    vueSource: vueLayout("bullet-list", bulletListTemplate()),
  },
  {
    id: "two-column",
    name: "Two Column",
    category: "basic",
    description: "Two panels for comparison, decomposition, or paired ideas.",
    propsSchema: basePropsSchema,
    defaultProps: {
      columns: [
        { title: "Left", items: ["Item one", "Item two"] },
        { title: "Right", items: ["Item one", "Item two"] },
      ],
    },
    vueFile: "two-column.vue",
    vueSource: vueLayout("two-column", twoColumnTemplate()),
  },
  {
    id: "image-left-text-right",
    name: "Image + Text",
    category: "basic",
    description: "Image on the left, explanation or bullets on the right.",
    propsSchema: basePropsSchema,
    defaultProps: { image: "", alt: "", points: ["Observation", "Meaning", "Next step"] },
    vueFile: "image-left-text-right.vue",
    vueSource: vueLayout("image-left-text-right", imageTextTemplate()),
  },
  {
    id: "progress-dashboard",
    name: "Progress Dashboard",
    category: "research",
    description: "Done, doing, next plan, and problems in a compact dashboard.",
    propsSchema: basePropsSchema,
    defaultProps: {
      done: [{ label: "Literature review", value: 100 }],
      doing: [{ label: "Prototype", value: 60 }],
      nextPlan: ["Refine system diagram"],
      problem: ["Data collection method"],
    },
    vueFile: "progress-dashboard.vue",
    vueSource: vueLayout("progress-dashboard", progressDashboardTemplate()),
  },
  {
    id: "system-flow",
    name: "System Flow",
    category: "research",
    description: "A vertical or horizontal system pipeline with side evidence.",
    propsSchema: basePropsSchema,
    defaultProps: {
      subtitle: "System concept",
      steps: ["User", "Interaction", "Data capture", "Analysis", "Output"],
      sideTitle: "Signals",
      sideItems: ["Voice", "Expression", "Behavior"],
      note: "Use natural interaction to reduce collection burden.",
    },
    vueFile: "system-flow.vue",
    vueSource: vueLayout("system-flow", systemFlowTemplate()),
  },
  {
    id: "quote-callout",
    name: "Quote Callout",
    category: "basic",
    description: "One statement with supporting note.",
    propsSchema: basePropsSchema,
    defaultProps: { quote: "The key message goes here.", source: "" },
    vueFile: "quote-callout.vue",
    vueSource: vueLayout("quote-callout", quoteCalloutTemplate()),
  },
  {
    id: "code-walkthrough",
    name: "Code Walkthrough",
    category: "teaching",
    description: "Code block with explanatory bullets.",
    propsSchema: basePropsSchema,
    defaultProps: { language: "ts", code: "const value = 42", points: ["Explain the key line"] },
    vueFile: "code-walkthrough.vue",
    vueSource: vueLayout("code-walkthrough", codeWalkthroughTemplate()),
  },
  {
    id: "exercise-checklist",
    name: "Exercise Checklist",
    category: "teaching",
    description: "Classroom tasks or practice checklist.",
    propsSchema: basePropsSchema,
    defaultProps: { items: ["Task one", "Task two", "Task three"] },
    vueFile: "exercise-checklist.vue",
    vueSource: vueLayout("exercise-checklist", exerciseChecklistTemplate()),
  },
  {
    id: "lab-progress",
    name: "Lab Progress",
    category: "lab",
    description: "Lab meeting progress page based on Done, Doing, Next Plan, Problem.",
    propsSchema: basePropsSchema,
    defaultProps: {
      personName: "Name",
      researchTitle: "Research title",
      done: [{ label: "Related work", value: 100 }],
      doing: [{ label: "System concept", value: 70 }],
      nextPlan: ["Prototype plan"],
      problem: ["Natural data collection"],
    },
    vueFile: "lab-progress.vue",
    vueSource: vueLayout("lab-progress", progressDashboardTemplate()),
  },
  {
    id: "research-system-concept",
    name: "Research System Concept",
    category: "lab",
    description: "Research system concept with flow and available signals.",
    propsSchema: basePropsSchema,
    defaultProps: {
      subtitle: "System concept",
      steps: ["Participant", "Interaction", "Multimodal capture", "Analysis", "Visualization"],
      sideTitle: "Available information",
      sideItems: ["Voice", "Expression", "Reaction speed", "Logs"],
      note: "A concept slide for discussion.",
    },
    vueFile: "research-system-concept.vue",
    vueSource: vueLayout("research-system-concept", systemFlowTemplate()),
  },
];

const layoutsById = new Map(builtinLayouts.map((layout) => [layout.id, layout]));

export function getLayoutDefinition(id: string | undefined): LayoutDefinition {
  return layoutsById.get((id as LayoutId) ?? "bullet-list") ?? layoutsById.get("bullet-list")!;
}

export function defaultLayoutForSlideType(type: SlideType | undefined): LayoutId {
  switch (type) {
    case "cover":
      return "title-cover";
    case "section":
      return "section-divider";
    case "comparison":
    case "two_column":
      return "two-column";
    case "code_explain":
      return "code-walkthrough";
    case "checklist":
      return "exercise-checklist";
    case "process":
    case "workflow":
    case "trace_table":
      return "system-flow";
    case "metric_grid":
    case "principle_card":
    case "bullet_summary":
      return "bullet-list";
    case "note_callout":
    case "closing":
      return "quote-callout";
    default:
      return "bullet-list";
  }
}

function vueLayout(layoutClass: string, template: string): string {
  return `<script setup lang="ts">
interface LayoutItem {
  label?: string
  value?: string | number
  title?: string
  body?: string
  items?: string[]
}

interface LayoutProps {
  title?: string
  subtitle?: string
  kicker?: string
  lead?: string
  image?: string
  alt?: string
  caption?: string
  bodyTitle?: string
  body?: string
  quote?: string
  statement?: string
  source?: string
  language?: string
  code?: string
  note?: string
  noteTitle?: string
  personName?: string
  researchTitle?: string
  flowTitle?: string
  sideTitle?: string
  points?: string[]
  items?: string[]
  steps?: string[]
  sideItems?: string[]
  availableInfo?: string[]
  nextPlan?: string[]
  problem?: string[]
  columns?: LayoutItem[]
  done?: LayoutItem[]
  doing?: LayoutItem[]
}

const props = defineProps<LayoutProps>()

const assetSrc = (value?: string) => {
  if (!value) return ''
  if (/^(https?:|file:|data:|\\/)/.test(value)) return value
  return value.startsWith('assets/') ? \`/\${value}\` : value
}

const asArray = (value: unknown) => Array.isArray(value) ? value : []
const clampPercent = (value: unknown) => Math.max(0, Math.min(100, Number(value) || 0))
</script>

<template>
${template}
</template>
`;
}

function titleCoverTemplate(): string {
  return `  <main class="sf-slide sf-cover">
    <section class="sf-cover-copy">
      <p v-if="props.kicker" class="sf-kicker">{{ props.kicker }}</p>
      <h1>{{ props.title }}</h1>
      <p v-if="props.subtitle" class="sf-cover-subtitle">{{ props.subtitle }}</p>
    </section>
    <img v-if="props.image" class="sf-cover-image" :src="assetSrc(props.image)" :alt="props.alt || props.title" />
  </main>`;
}

function sectionDividerTemplate(): string {
  return `  <main class="sf-slide sf-section">
    <p class="sf-kicker">Section</p>
    <h1>{{ props.title }}</h1>
    <p v-if="props.lead" class="sf-lead">{{ props.lead }}</p>
  </main>`;
}

function bulletListTemplate(): string {
  return `  <main class="sf-slide sf-standard">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.kicker || 'Key points' }}</p>
      <h1>{{ props.title }}</h1>
    </header>
    <ul class="sf-bullet-list">
      <li v-for="(point, index) in asArray(props.points || props.items)" :key="index">{{ point }}</li>
    </ul>
  </main>`;
}

function twoColumnTemplate(): string {
  return `  <main class="sf-slide sf-standard">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.kicker || 'Structure' }}</p>
      <h1>{{ props.title }}</h1>
    </header>
    <section class="sf-two-column">
      <article v-for="(column, index) in asArray(props.columns)" :key="index" class="sf-panel">
        <h2>{{ column.title }}</h2>
        <ul>
          <li v-for="(item, itemIndex) in asArray(column.items)" :key="itemIndex">{{ item }}</li>
        </ul>
      </article>
    </section>
  </main>`;
}

function imageTextTemplate(): string {
  return `  <main class="sf-slide sf-standard">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.kicker || 'Visual' }}</p>
      <h1>{{ props.title }}</h1>
    </header>
    <section class="sf-image-text">
      <figure class="sf-image-frame">
        <img v-if="props.image" :src="assetSrc(props.image)" :alt="props.alt || props.title" />
        <figcaption v-if="props.caption">{{ props.caption }}</figcaption>
      </figure>
      <article class="sf-panel">
        <h2>{{ props.bodyTitle || 'What to notice' }}</h2>
        <p v-if="props.body">{{ props.body }}</p>
        <ul>
          <li v-for="(point, index) in asArray(props.points)" :key="index">{{ point }}</li>
        </ul>
      </article>
    </section>
  </main>`;
}

function progressDashboardTemplate(): string {
  return `  <main class="sf-slide sf-standard sf-progress">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.personName || props.kicker || 'Progress' }}</p>
      <h1>{{ props.title }}</h1>
      <p v-if="props.researchTitle" class="sf-lead">{{ props.researchTitle }}</p>
    </header>
    <section class="sf-dashboard-grid">
      <article class="sf-panel">
        <h2>Done</h2>
        <div v-for="(item, index) in asArray(props.done)" :key="index" class="sf-progress-row">
          <span>{{ item.label }}</span>
          <strong>{{ clampPercent(item.value) }}%</strong>
          <div class="sf-meter"><i :style="{ width: clampPercent(item.value) + '%' }" /></div>
        </div>
      </article>
      <article class="sf-panel">
        <h2>Doing</h2>
        <div v-for="(item, index) in asArray(props.doing)" :key="index" class="sf-progress-row">
          <span>{{ item.label }}</span>
          <strong>{{ clampPercent(item.value) }}%</strong>
          <div class="sf-meter"><i :style="{ width: clampPercent(item.value) + '%' }" /></div>
        </div>
      </article>
      <article class="sf-panel sf-list-panel">
        <h2>Next Plan</h2>
        <ul><li v-for="(item, index) in asArray(props.nextPlan)" :key="index">{{ item }}</li></ul>
      </article>
      <article class="sf-panel sf-list-panel sf-problem">
        <h2>Problem</h2>
        <ul><li v-for="(item, index) in asArray(props.problem)" :key="index">{{ item }}</li></ul>
      </article>
    </section>
  </main>`;
}

function systemFlowTemplate(): string {
  return `  <main class="sf-slide sf-standard sf-system">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.kicker || 'System' }}</p>
      <h1>{{ props.title }}</h1>
      <p v-if="props.subtitle" class="sf-lead">{{ props.subtitle }}</p>
    </header>
    <section class="sf-system-grid">
      <article class="sf-flow-panel">
        <h2>{{ props.flowTitle || 'Flow' }}</h2>
        <div class="sf-flow-stack">
          <template v-for="(step, index) in asArray(props.steps)" :key="index">
            <div class="sf-flow-step">{{ step }}</div>
            <span v-if="index < asArray(props.steps).length - 1">↓</span>
          </template>
        </div>
      </article>
      <article class="sf-panel">
        <h2>{{ props.sideTitle || 'Signals' }}</h2>
        <ul><li v-for="(item, index) in asArray(props.sideItems || props.availableInfo)" :key="index">{{ item }}</li></ul>
      </article>
    </section>
    <p v-if="props.note" class="sf-note">{{ props.note }}</p>
  </main>`;
}

function quoteCalloutTemplate(): string {
  return `  <main class="sf-slide sf-quote">
    <p class="sf-kicker">{{ props.kicker || 'Takeaway' }}</p>
    <h1>{{ props.title }}</h1>
    <blockquote>{{ props.quote || props.statement || props.body }}</blockquote>
    <p v-if="props.source" class="sf-lead">{{ props.source }}</p>
  </main>`;
}

function codeWalkthroughTemplate(): string {
  return `  <main class="sf-slide sf-standard sf-code-slide">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.language || 'code' }}</p>
      <h1>{{ props.title }}</h1>
    </header>
    <section class="sf-code-grid">
      <pre><code>{{ props.code }}</code></pre>
      <article class="sf-panel">
        <h2>{{ props.noteTitle || 'Notes' }}</h2>
        <p v-if="props.note">{{ props.note }}</p>
        <ul><li v-for="(point, index) in asArray(props.points)" :key="index">{{ point }}</li></ul>
      </article>
    </section>
  </main>`;
}

function exerciseChecklistTemplate(): string {
  return `  <main class="sf-slide sf-standard">
    <header class="sf-header">
      <p class="sf-kicker">{{ props.kicker || 'Exercise' }}</p>
      <h1>{{ props.title }}</h1>
    </header>
    <section class="sf-checklist">
      <label v-for="(item, index) in asArray(props.items)" :key="index">
        <span>{{ index + 1 }}</span>
        <strong>{{ item }}</strong>
      </label>
    </section>
  </main>`;
}
