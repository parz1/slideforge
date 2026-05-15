import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDeckCandidate } from "./domain/deck-validation.mjs";
import { createAiDraftService } from "./services/ai-draft-service.mjs";
import { createProjectStore } from "./services/project-store.mjs";
import { createSlidevService } from "./services/slidev-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let mainWindowMode = "welcome";
let activePreviewWindow = null;
let lastActiveSlide = null;
let activeTask = null;
const aiDraftService = createAiDraftService({
  findWorkspaceRoot,
});
const projectStore = createProjectStore({
  envStatus: aiDraftService.envStatus,
  userDataPath: () => app.getPath("userData"),
});
const slidevService = createSlidevService({
  assembleDeckSpec: projectStore.assembleDeckSpec,
  findWorkspaceRoot,
  validateDeckCandidate,
});

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
    width: isWelcome ? 900 : 1280,
    height: isWelcome ? 560 : 800,
    minWidth: isWelcome ? 760 : 1120,
    minHeight: isWelcome ? 500 : 680,
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
    save_project_config: ({ path: taskPath, projectConfig }) =>
      saveProjectConfig(taskPath, projectConfig),
    save_slide_file: ({ path: taskPath, fileName, markdown, projectConfig }) =>
      saveSlideFile(taskPath, fileName, markdown, projectConfig),
    create_slide_file: ({ path: taskPath, layout }) => createSlideFile(taskPath, layout),
    duplicate_slide_file: ({ path: taskPath, fileName, markdown }) =>
      duplicateSlideFile(taskPath, fileName, markdown),
    delete_slide_file: ({ path: taskPath, fileName }) => deleteSlideFile(taskPath, fileName),
    save_task_deck: ({ path: taskPath, fileName, markdown, projectConfig }) =>
      saveSlideFile(taskPath, fileName, markdown, projectConfig),
    generate_task_deck: ({ path: taskPath }) => generateTaskDeck(taskPath),
    import_asset_files: ({ path: taskPath, filePaths }) => importAssetFiles(taskPath, filePaths),
    preview_task_deck: ({ path: taskPath, deck }) => previewTaskDeck(taskPath, deck),
    build_task_deck: ({ path: taskPath, deck }) => buildTaskDeck(taskPath, deck),
    preview_active_slide: ({ path: taskPath, deck }) => previewActiveSlide(taskPath, deck),
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
  return projectStore.listVaultProjects();
}

async function createProject(projectName) {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: "Choose where to create the Slideforge project",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const task = await projectStore.createProjectAt(result.filePaths[0], projectName);
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

  const task = await projectStore.openProject(result.filePaths[0]);
  activeTask = task;
  return task;
}

async function loadTaskFolder(taskPath) {
  const task = await projectStore.loadTaskFolder(taskPath);
  activeTask = task;
  return task;
}

async function saveProjectConfig(taskPath, projectConfig) {
  const task = await projectStore.saveProjectConfig(taskPath, projectConfig);
  activeTask = task;
  return task;
}

async function saveSlideFile(taskPath, fileName, markdown, projectConfig) {
  const task = await projectStore.saveSlideFile(taskPath, fileName, markdown, projectConfig);
  activeTask = task;
  return task;
}

async function createSlideFile(taskPath, layout) {
  const task = await projectStore.createSlideFile(taskPath, layout);
  activeTask = task;
  return task;
}

async function duplicateSlideFile(taskPath, fileName, markdown) {
  const task = await projectStore.duplicateSlideFile(taskPath, fileName, markdown);
  activeTask = task;
  return task;
}

async function deleteSlideFile(taskPath, fileName) {
  const task = await projectStore.deleteSlideFile(taskPath, fileName);
  activeTask = task;
  return task;
}

async function generateTaskDeck(taskPath) {
  const taskDir = await projectStore.canonicalTaskDir(taskPath);
  const task = await projectStore.loadTaskFolderInner(taskDir);
  return aiDraftService.generateTaskDeck(task);
}

async function buildTaskDeck(taskPath) {
  const taskDir = await projectStore.canonicalTaskDir(taskPath);
  return slidevService.buildTaskDeck(taskDir);
}

async function previewTaskDeck(taskPath) {
  const taskDir = await projectStore.canonicalTaskDir(taskPath);
  return slidevService.previewTaskDeck(taskDir);
}

async function previewActiveSlide(taskPath, deck) {
  const taskDir = await projectStore.canonicalTaskDir(taskPath);
  return slidevService.previewActiveSlide(taskDir, deck);
}

async function importAssetFiles(taskPath, filePaths) {
  const taskDir = await projectStore.canonicalTaskDir(taskPath);
  let sourcePaths = Array.isArray(filePaths)
    ? filePaths.map((filePath) => String(filePath)).filter(Boolean)
    : [];

  if (sourcePaths.length === 0) {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: "Import Slideforge assets",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Supported assets",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "webp",
            "svg",
            "md",
            "txt",
            "ts",
            "tsx",
            "js",
            "jsx",
            "json",
            "yaml",
            "yml",
          ],
        },
      ],
    });
    if (result.canceled) {
      return projectStore.loadTaskFolderInner(taskDir);
    }
    sourcePaths = result.filePaths;
  }

  const task = await projectStore.importAssetFiles(taskDir, sourcePaths);
  activeTask = task;
  return task;
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

process.on("uncaughtException", (error) => {
  console.error(error);
  dialog.showErrorBox("Slideforge error", error instanceof Error ? error.message : String(error));
});

process.on("unhandledRejection", (error) => {
  console.error(error);
});
