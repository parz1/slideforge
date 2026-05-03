import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_TEXT_ASSET_BYTES = 48_000;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const TEXT_EXTENSIONS = new Set([
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
const SLIDE_TYPES = new Set([
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

let mainWindow = null;
let mainWindowMode = "welcome";
let activePreviewWindow = null;
let lastActiveSlide = null;
let activeTask = null;

app.whenReady().then(() => {
  registerIpcHandlers();
  createAppWindow(activeTask ? "workbench" : "welcome");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow(activeTask ? "workbench" : "welcome");
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function createAppWindow(mode) {
  const isWelcome = mode === "welcome";
  const windowRef = new BrowserWindow({
    width: isWelcome ? 980 : 1440,
    height: isWelcome ? 640 : 940,
    minWidth: isWelcome ? 820 : 1120,
    minHeight: isWelcome ? 560 : 720,
    title: "Slideforge",
    backgroundColor: "#f7f8fa",
    frame: !isWelcome,
    resizable: true,
    roundedCorners: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow = windowRef;
  mainWindowMode = mode;

  windowRef.once("ready-to-show", () => {
    windowRef.show();
    windowRef.focus();
  });
  windowRef.on("closed", () => {
    if (mainWindow === windowRef) {
      mainWindow = null;
    }
  });

  void loadRenderer(windowRef);
  return windowRef;
}

async function loadRenderer(window, hash = "") {
  const rendererUrl = process.env.SLIDEFORGE_RENDERER_URL;
  if (process.env.SLIDEFORGE_DESKTOP_DEV === "1" || rendererUrl) {
    const url = new URL(rendererUrl ?? "http://127.0.0.1:1420");
    if (hash) {
      url.hash = hash;
    }
    await window.loadURL(url.toString());
    return;
  }

  const workspaceRoot = findWorkspaceRoot();
  await window.loadFile(path.join(workspaceRoot, "apps/desktop/dist/index.html"), {
    hash,
  });
}

function registerIpcHandlers() {
  const handlers = {
    get_initial_task: () => activeTask,
    list_vault_projects: listVaultProjects,
    create_project: ({ projectName }) => createProject(projectName),
    open_task_folder: openTaskFolder,
    load_task_folder: ({ path: taskPath }) => loadTaskFolder(taskPath),
    save_task_deck: ({ path: taskPath, deck }) => saveTaskDeck(taskPath, deck),
    generate_task_deck: ({ path: taskPath }) => generateTaskDeck(taskPath),
    build_task_deck: ({ path: taskPath, deck }) => buildTaskDeck(taskPath, deck),
  };

  for (const [command, handler] of Object.entries(handlers)) {
    ipcMain.handle(`slideforge:${command}`, async (_event, args = {}) => handler(args));
  }

  ipcMain.handle("window:show-workbench", async () => {
    if (mainWindowMode !== "workbench") {
      recreateAppWindow("workbench");
    }
  });

  ipcMain.handle("window:show-welcome", async () => {
    activeTask = null;
    recreateAppWindow("welcome");
  });

  ipcMain.handle("window:action", (_event, action) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    if (action === "minimize") {
      mainWindow.minimize();
    }
    if (action === "close") {
      mainWindow.close();
    }
  });

  ipcMain.handle("active-preview:open", async (_event, slide) => {
    lastActiveSlide = slide;
    await openActivePreviewWindow();
    sendActiveSlideUpdate();
    return true;
  });

  ipcMain.handle("active-preview:update-slide", (_event, slide) => {
    lastActiveSlide = slide;
    sendActiveSlideUpdate();
  });

  ipcMain.handle("active-preview:ready", () => {
    sendActiveSlideUpdate();
  });
}

function recreateAppWindow(mode) {
  const previousWindow = mainWindow;
  createAppWindow(mode);
  if (previousWindow && !previousWindow.isDestroyed()) {
    previousWindow.close();
  }
}

async function openActivePreviewWindow() {
  if (activePreviewWindow && !activePreviewWindow.isDestroyed()) {
    activePreviewWindow.show();
    activePreviewWindow.focus();
    return;
  }

  activePreviewWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: "Slideforge Active Preview",
    backgroundColor: "#f7f8fa",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  activePreviewWindow.once("ready-to-show", () => {
    activePreviewWindow?.show();
  });
  activePreviewWindow.webContents.once("did-finish-load", sendActiveSlideUpdate);
  activePreviewWindow.on("closed", () => {
    activePreviewWindow = null;
  });

  await loadRenderer(activePreviewWindow, "/active-preview");
}

function sendActiveSlideUpdate() {
  if (!lastActiveSlide || !activePreviewWindow || activePreviewWindow.isDestroyed()) {
    return;
  }
  activePreviewWindow.webContents.send("active-preview:update", lastActiveSlide);
}

async function listVaultProjects() {
  const vault = await readVault();
  return {
    projects: vault.projects,
  };
}

async function createProject(projectName) {
  const name = String(projectName ?? "").trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: "Choose where to create the Slideforge project",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const projectDir = path.join(result.filePaths[0], sanitizeProjectFolderName(name));
  if (fsSync.existsSync(projectDir)) {
    throw new Error(`Project folder already exists: ${projectDir}`);
  }

  await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "output"), { recursive: true });
  await fs.writeFile(
    path.join(projectDir, "brief.md"),
    `# ${name}\n\n受众：\n\n目标：\n\n限制：\n\n素材引用：\n\n`,
  );
  await fs.writeFile(
    path.join(projectDir, "outline.md"),
    `# ${name} 大纲\n\n1. 封面\n2. 课程目标\n3. 核心讲解\n4. 课堂练习\n5. 总结\n`,
  );

  const task = await loadTaskFolderInner(projectDir);
  await addProjectToVault(projectDir);
  activeTask = task;
  return task;
}

async function openTaskFolder() {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: "Open Slideforge project",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const task = await loadTaskFolderInner(result.filePaths[0]);
  await addProjectToVault(result.filePaths[0]);
  activeTask = task;
  return task;
}

async function loadTaskFolder(taskPath) {
  const task = await loadTaskFolderInner(taskPath);
  await addProjectToVault(taskPath);
  activeTask = task;
  return task;
}

async function saveTaskDeck(taskPath, deck) {
  const taskDir = await canonicalTaskDir(taskPath);
  const validationErrors = validateDeckCandidate(deck);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }
  await writeDeckYaml(taskDir, deck);
}

async function generateTaskDeck(taskPath) {
  const taskDir = await canonicalTaskDir(taskPath);
  const task = await loadTaskFolderInner(taskDir);
  const envConfig = await loadEnvConfig();
  if (!envConfig.key) {
    throw new Error("OPENAI_API_KEY is missing in .env.local, .env, or process env.");
  }
  if (!envConfig.model) {
    throw new Error("OPENAI_MODEL is missing in .env.local, .env, or process env.");
  }
  if (!task.brief.trim() && !task.outline.trim()) {
    throw new Error("brief.md and outline.md are both empty.");
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

async function buildTaskDeck(taskPath, deck) {
  const taskDir = await canonicalTaskDir(taskPath);
  const validationErrors = validateDeckCandidate(deck);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }
  await writeDeckYaml(taskDir, deck);

  const workspaceRoot = findWorkspaceRoot();
  const deckPath = path.join(taskDir, "deck.yaml");
  const slidevDir = path.join(taskDir, "output", "slidev");
  await fs.mkdir(slidevDir, { recursive: true });

  const buildOutput = await runCommand(
    "pnpm",
    [
      "exec",
      "tsx",
      "packages/compiler/src/cli.ts",
      "build",
      deckPath,
      "--out",
      slidevDir,
    ],
    workspaceRoot,
  );
  let log = commandOutputToLog(buildOutput);
  if (buildOutput.code !== 0) {
    throw new Error(`Deck build failed:\n${log}`);
  }

  await copyTaskAssets(taskDir, slidevDir);

  const warnings = [];
  const pdfPath = path.join(taskDir, "output", "slides.pdf");
  const exportOutput = await runCommand(
    "pnpm",
    ["exec", "slidev", "export", path.join(slidevDir, "slides.md"), "--output", pdfPath],
    workspaceRoot,
  ).catch((error) => {
    warnings.push(
      `Slidev PDF export could not start: ${error.message}. Slidev output was still generated.`,
    );
    return null;
  });

  let completedPdfPath = null;
  if (exportOutput) {
    if (exportOutput.code === 0) {
      log += `\n${commandOutputToLog(exportOutput)}`;
      completedPdfPath = pdfPath;
    } else {
      warnings.push(
        `Slidev PDF export failed. Slidev output was still generated.\n${commandOutputToLog(
          exportOutput,
        )}`,
      );
    }
  }

  return {
    slidevDir,
    pdfPath: completedPdfPath,
    warnings,
    log,
  };
}

async function loadTaskFolderInner(taskPath) {
  const taskDir = await canonicalTaskDir(taskPath);
  const brief = await readOptionalText(path.join(taskDir, "brief.md"));
  const outline = await readOptionalText(path.join(taskDir, "outline.md"));
  const assets = await scanAssets(taskDir);
  const refs = extractAssetRefs(`${brief}\n${outline}`);
  const assetByPath = new Map(assets.map((asset) => [asset.path, asset]));
  const missingAssetRefs = [];
  const referencedAssets = [];

  for (const assetRef of refs) {
    const asset = assetByPath.get(assetRef);
    if (asset) {
      referencedAssets.push(await readReferencedAsset(taskDir, asset));
    } else {
      missingAssetRefs.push(assetRef);
    }
  }

  return {
    path: taskDir,
    name: path.basename(taskDir) || "Untitled task",
    brief,
    outline,
    deck: await readOptionalDeck(taskDir),
    assets,
    referencedAssets,
    missingAssetRefs,
    envStatus: await envStatus(),
  };
}

async function canonicalTaskDir(taskPath) {
  const canonical = await fs.realpath(String(taskPath ?? ""));
  const stat = await fs.stat(canonical);
  if (!stat.isDirectory()) {
    throw new Error("Task path is not a directory.");
  }
  return canonical;
}

async function readVault() {
  const vaultFile = vaultPath();
  if (!fsSync.existsSync(vaultFile)) {
    return { projects: [] };
  }
  const raw = await fs.readFile(vaultFile, "utf8");
  const data = JSON.parse(raw);
  data.projects = Array.isArray(data.projects) ? data.projects : [];
  for (const project of data.projects) {
    project.exists = fsSync.existsSync(project.path) && fsSync.statSync(project.path).isDirectory();
  }
  return data;
}

async function writeVault(data) {
  const vaultFile = vaultPath();
  await fs.mkdir(path.dirname(vaultFile), { recursive: true });
  await fs.writeFile(vaultFile, `${JSON.stringify(data, null, 2)}\n`);
}

async function addProjectToVault(projectDir) {
  const canonical = await canonicalTaskDir(projectDir);
  const vault = await readVault();
  vault.projects = vault.projects.filter((project) => project.path !== canonical);
  vault.projects.unshift({
    name: path.basename(canonical) || "Untitled project",
    path: canonical,
    lastOpenedAt: new Date().toISOString(),
    exists: true,
  });
  await writeVault(vault);
}

function vaultPath() {
  return path.join(app.getPath("userData"), "vault.json");
}

function sanitizeProjectFolderName(name) {
  const sanitized = name
    .split("")
    .map((character) => {
      if (/[a-z0-9_-]/i.test(character)) {
        return character;
      }
      if (/\s/.test(character)) {
        return "-";
      }
      return "";
    })
    .join("")
    .replace(/^-+|-+$/g, "");
  return sanitized || "slideforge-project";
}

async function readOptionalText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

async function readOptionalDeck(taskDir) {
  const deckPath = path.join(taskDir, "deck.yaml");
  if (!fsSync.existsSync(deckPath)) {
    return null;
  }
  const raw = await fs.readFile(deckPath, "utf8");
  try {
    return yaml.load(raw);
  } catch (error) {
    throw new Error(`Failed to parse deck.yaml: ${error.message}`);
  }
}

async function scanAssets(taskDir) {
  const assetsDir = path.join(taskDir, "assets");
  if (!fsSync.existsSync(assetsDir)) {
    return [];
  }

  const assets = [];
  const usedIds = new Set();
  await scanAssetsRecursive(taskDir, assetsDir, assets, usedIds);
  assets.sort((a, b) => a.path.localeCompare(b.path));
  return assets;
}

async function scanAssetsRecursive(taskDir, dir, assets, usedIds) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const itemPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanAssetsRecursive(taskDir, itemPath, assets, usedIds);
      continue;
    }

    const kind = assetKind(itemPath);
    if (!kind) {
      continue;
    }
    const relative = relativeAssetPath(taskDir, itemPath);
    assets.push({
      id: uniqueAssetId(relative, usedIds),
      path: relative,
      kind,
      description: undefined,
    });
  }
}

function assetKind(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    return "text";
  }
  return null;
}

function relativeAssetPath(taskDir, filePath) {
  const relative = path.relative(taskDir, filePath).split(path.sep).join("/");
  if (!relative.startsWith("assets/") || relative.includes("../")) {
    throw new Error(`Invalid asset path: ${relative}`);
  }
  return relative;
}

function uniqueAssetId(assetPath, usedIds) {
  const base = sanitizeId(path.parse(assetPath).name || "asset");
  let candidate = base;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function sanitizeId(value) {
  const sanitized = value.replace(/[^a-z0-9_-]/gi, "_").replace(/^_+|_+$/g, "");
  return sanitized || "asset";
}

function extractAssetRefs(text) {
  const refs = new Set();
  const matcher = /@((?:assets\/)[^\s)\]\}"'>,;]+)/g;
  for (const match of text.matchAll(matcher)) {
    const candidate = match[1];
    if (isSafeRelativeAssetPath(candidate)) {
      refs.add(candidate);
    }
  }
  return [...refs].sort();
}

function isSafeRelativeAssetPath(relative) {
  if (!relative.startsWith("assets/")) {
    return false;
  }
  const normalized = path.normalize(relative);
  return (
    !path.isAbsolute(relative) &&
    !normalized.startsWith("..") &&
    normalized.split(path.sep).every((part) => part !== "..")
  );
}

async function readReferencedAsset(taskDir, asset) {
  const content = {
    assetId: asset.id,
    path: asset.path,
    kind: asset.kind,
  };

  if (asset.kind === "text") {
    const assetPath = await safeJoin(taskDir, asset.path);
    const stat = await fs.stat(assetPath);
    content.text =
      stat.size > MAX_TEXT_ASSET_BYTES
        ? `[Skipped: text asset is larger than ${MAX_TEXT_ASSET_BYTES} bytes]`
        : await fs.readFile(assetPath, "utf8");
  }

  return content;
}

async function safeJoin(taskDir, relative) {
  if (!isSafeRelativeAssetPath(relative)) {
    throw new Error(`Unsafe relative asset path: ${relative}`);
  }
  const joined = path.join(taskDir, relative);
  const parent = await fs.realpath(path.dirname(joined));
  const relation = path.relative(taskDir, parent);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error(`Asset path escapes task folder: ${relative}`);
  }
  return joined;
}

async function writeDeckYaml(taskDir, deck) {
  const deckPath = path.join(taskDir, "deck.yaml");
  const output = yaml.dump(deck, {
    noRefs: true,
    lineWidth: 100,
  });
  await fs.writeFile(deckPath, output);
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

function findWorkspaceRoot() {
  const candidates = [
    process.cwd(),
    app.getAppPath?.(),
    path.resolve(__dirname, "../../.."),
  ].filter(Boolean);

  for (const start of candidates) {
    let current = path.resolve(start);
    while (true) {
      const packageJson = path.join(current, "package.json");
      if (fsSync.existsSync(packageJson)) {
        try {
          const manifest = JSON.parse(fsSync.readFileSync(packageJson, "utf8"));
          if (manifest.name === "slideforge") {
            return current;
          }
        } catch {
          // Keep walking upward.
        }
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return path.resolve(__dirname, "../../..");
}

function buildGenerationPrompt(task) {
  return `You are Slideforge's teaching deck planner.

Return only JSON. Generate a complete Slideforge Deck Spec for the built-in "teaching" template.

Hard rules:
- Do not generate Slidev Markdown.
- Use this exact top-level shape: meta, assets, slides.
- meta must include title, language, theme, template.
- meta.template must be "teaching"; meta.theme should be "teaching"; language should default to zh-CN.
- slides must use only these types: ${[...SLIDE_TYPES].join(", ")}.
- Each slide needs id, type, title, content, and optional speakerNotes, animation, visual.
- If a slide uses visual, visual.assetId must refer to an image asset id in the assets list.
- Use only explicitly referenced assets. Do not invent asset paths.
- Text assets may inform content. Image assets may be referenced visually but should not be described as if you can see them.
- Generate a practical teaching PPT draft, not marketing copy.

Available assets:
${JSON.stringify(task.assets, null, 2)}

Referenced asset contents:
${JSON.stringify(task.referencedAssets, null, 2)}

brief.md:
${task.brief}

outline.md:
${task.outline}
`;
}

function buildRepairPrompt(task, invalidJson, validationErrors) {
  return `Repair this Slideforge Deck Spec JSON. Return only valid JSON.

Validation errors:
${validationErrors.join("\n")}

Valid assets:
${JSON.stringify(task.assets, null, 2)}

Original brief:
${task.brief}

Original outline:
${task.outline}

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

function validateDeckCandidate(deck) {
  const errors = [];
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return ["Deck must be a JSON object."];
  }

  const meta = deck.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return ["meta is required."];
  }
  for (const field of ["title", "language", "theme"]) {
    if (typeof meta[field] !== "string" || !meta[field].trim()) {
      errors.push(`meta.${field} is required.`);
    }
  }
  if ((meta.template ?? "teaching") !== "teaching") {
    errors.push("meta.template must be teaching.");
  }

  const assetIds = new Set(
    Array.isArray(deck.assets)
      ? deck.assets
          .map((asset) => (asset && typeof asset.id === "string" ? asset.id : null))
          .filter(Boolean)
      : [],
  );

  if (!Array.isArray(deck.slides)) {
    errors.push("slides must be an array.");
    return errors;
  }
  if (deck.slides.length === 0) {
    errors.push("slides must include at least one slide.");
  }
  deck.slides.forEach((slide, index) => {
    const label = `slides[${index}]`;
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    for (const field of ["id", "type", "title"]) {
      if (typeof slide[field] !== "string" || !slide[field].trim()) {
        errors.push(`${label}.${field} is required.`);
      }
    }
    if (!SLIDE_TYPES.has(slide.type)) {
      errors.push(`${label}.type is not supported.`);
    }
    if (!slide.content || typeof slide.content !== "object" || Array.isArray(slide.content)) {
      errors.push(`${label}.content must be an object.`);
    }
    if (slide.visual && typeof slide.visual === "object" && !Array.isArray(slide.visual)) {
      const assetId = slide.visual.assetId;
      if (typeof assetId !== "string" || !assetId.trim()) {
        errors.push(`${label}.visual.assetId is required.`);
      } else if (!assetIds.has(assetId)) {
        errors.push(`${label}.visual.assetId does not match a deck asset.`);
      }
    }
  });

  return errors;
}

function summarizeRawModelText(value) {
  const limit = 900;
  return value.length <= limit ? value : `${value.slice(0, limit)}\n...`;
}

async function copyTaskAssets(taskDir, slidevDir) {
  const assetsDir = path.join(taskDir, "assets");
  if (!fsSync.existsSync(assetsDir)) {
    return;
  }
  await copyDirRecursive(assetsDir, path.join(slidevDir, "assets"));
}

async function copyDirRecursive(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(source, target);
    } else {
      await fs.copyFile(source, target);
    }
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

function commandOutputToLog(output) {
  return [output.stdout, output.stderr].join("\n");
}

process.on("uncaughtException", (error) => {
  console.error(error);
  dialog.showErrorBox("Slideforge error", error instanceof Error ? error.message : String(error));
});

process.on("unhandledRejection", (error) => {
  console.error(error);
});
