import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_THEME,
  LAYOUT_IDS,
  TEMPLATE_IDS,
} from "../domain/deck-constants.mjs";
import { validateDeckCandidate } from "../domain/deck-validation.mjs";

export function createAiDraftService({ findWorkspaceRoot }) {
  async function generateTaskDeck(task) {
    const envConfig = await loadEnvConfig();
    if (!envConfig.key) {
      throw new Error("OPENAI_API_KEY is missing in .env.local, .env, or process env.");
    }
    if (!envConfig.model) {
      throw new Error("OPENAI_MODEL is missing in .env.local, .env, or process env.");
    }
    if (task.slides.length === 0) {
      throw new Error("No slide markdown files found.");
    }

    const firstPrompt = buildGenerationPrompt(task);
    const firstText = await callOpenAiJson(envConfig.key, envConfig.model, firstPrompt);
    let repaired = false;
    let deck = parseModelDeck(firstText);
    let validationErrors = validateDeckCandidate(deck);

    if (validationErrors.length > 0) {
      repaired = true;
      const repairPrompt = buildRepairPrompt(task, firstText, validationErrors);
      const repairedText = await callOpenAiJson(envConfig.key, envConfig.model, repairPrompt);
      deck = parseModelDeck(repairedText);
      validationErrors = validateDeckCandidate(deck);
      if (validationErrors.length > 0) {
        throw new Error(
          `Generated Deck Spec is still invalid after repair: ${validationErrors.join("; ")}`,
        );
      }
    }

    return {
      deck,
      validationErrors,
      repaired,
      rawSummary: summarizeRawModelText(firstText),
    };
  }

  async function envStatus() {
    const config = await loadEnvConfig();
    const hasKey = Boolean(config.key);
    const hasModel = Boolean(config.model);
    let message = "OpenAI configuration found.";
    if (!hasKey && !hasModel) {
      message = "Missing OPENAI_API_KEY and OPENAI_MODEL in .env.local, .env, or process env.";
    } else if (!hasKey) {
      message = "Missing OPENAI_API_KEY in .env.local, .env, or process env.";
    } else if (!hasModel) {
      message = "Missing OPENAI_MODEL in .env.local, .env, or process env.";
    }
    return { hasKey, hasModel, message };
  }

  async function loadEnvConfig() {
    const root = findWorkspaceRoot();
    const envValues = await readEnvFile(path.join(root, ".env"));
    const localValues = await readEnvFile(path.join(root, ".env.local"));
    return {
      key: process.env.OPENAI_API_KEY || localValues.OPENAI_API_KEY || envValues.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || localValues.OPENAI_MODEL || envValues.OPENAI_MODEL,
    };
  }

  return {
    envStatus,
    generateTaskDeck,
    loadEnvConfig,
  };
}

async function readEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const values = {};
    for (const rawLine of raw.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      if (line.startsWith("export ")) {
        line = line.slice("export ".length).trim();
      }
      const separator = line.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      values[key] = value;
    }
    return values;
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function buildGenerationPrompt(task) {
  const template = TEMPLATE_IDS.has(task.projectConfig?.template)
    ? task.projectConfig.template
    : DEFAULT_TEMPLATE;
  const theme = template === "clean" ? "clean-light" : DEFAULT_THEME;
  const slideSources = task.slides.map((slide) => ({
    fileName: slide.fileName,
    frontmatter: slide.frontmatter,
    body: slide.body,
  }));
  return `You are Slideforge's deck planner.

Return only JSON. Generate a complete Slideforge Deck Spec for the built-in "${template}" template.

Hard rules:
- Do not generate Slidev Markdown.
- Use this exact top-level shape: meta, assets, slides.
- meta must include title, language, theme, template.
- meta.template must be "${template}"; meta.theme should be "${theme}"; language should default to zh-CN.
- slides must use only these layouts: ${[...LAYOUT_IDS].join(", ")}.
- Each slide needs id, layout, title, props, and optional speakerNotes.
- Put image references in props.image as a relative path such as assets/graph.png.
- Use only explicitly referenced assets. Do not invent asset paths.
- Text assets may inform content. Image assets may be referenced visually but should not be described as if you can see them.
- Generate a practical presentation draft, not marketing copy.

Available assets:
${JSON.stringify(task.assets, null, 2)}

Referenced asset contents:
${JSON.stringify(task.referencedAssets, null, 2)}

project.yaml:
${JSON.stringify(task.projectConfig, null, 2)}

Current slides/*.md:
${JSON.stringify(slideSources, null, 2)}
`;
}

function buildRepairPrompt(task, invalidJson, validationErrors) {
  const slideSources = task.slides.map((slide) => ({
    fileName: slide.fileName,
    frontmatter: slide.frontmatter,
    body: slide.body,
  }));
  return `Repair this Slideforge Deck Spec JSON. Return only valid JSON.

Validation errors:
${validationErrors.join("\n")}

Valid assets:
${JSON.stringify(task.assets, null, 2)}

project.yaml:
${JSON.stringify(task.projectConfig, null, 2)}

Current slides/*.md:
${JSON.stringify(slideSources, null, 2)}

Invalid JSON:
${invalidJson}
`;
}

async function callOpenAiJson(key, model, prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "You produce strict JSON for Slideforge Deck Spec generation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });
  const value = await response.json().catch((error) => {
    throw new Error(`OpenAI response was not JSON: ${error.message}`);
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${JSON.stringify(value)}`);
  }
  const outputText = extractOpenAiOutputText(value);
  if (!outputText) {
    throw new Error(`OpenAI response did not contain output text: ${JSON.stringify(value)}`);
  }
  return outputText;
}

function extractOpenAiOutputText(value) {
  if (typeof value.output_text === "string") {
    return value.output_text;
  }
  if (!Array.isArray(value.output)) {
    return null;
  }
  for (const item of value.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }
    for (const part of item.content) {
      if (typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return null;
}

function parseModelDeck(text) {
  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("Model output did not contain a complete JSON object.");
    }
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (error) {
      throw new Error(`Failed to parse generated Deck Spec JSON: ${error.message}`);
    }
  }
}

function summarizeRawModelText(value) {
  const limit = 900;
  return value.length <= limit ? value : `${value.slice(0, limit)}\n...`;
}
