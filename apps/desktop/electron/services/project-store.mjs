import fs from "node:fs/promises";
import path from "node:path";
import { LAYOUT_IDS } from "../domain/deck-constants.mjs";
import {
  extractAssetRefs,
  importAssetFiles as importAssetsIntoProject,
  readReferencedAsset,
  scanAssets,
} from "./asset-store.mjs";
import {
  deckFromProjectFiles,
  defaultMarkdownBodyForLayout,
  defaultProjectConfig,
  defaultSlideMarkdown,
  layoutTitle,
  normalizeProjectConfig,
  parseSlideMarkdown,
  readProjectConfig,
  readSlideFiles,
  safeSlideFilePath,
  sanitizeProjectFolderName,
  slideMarkdown,
  uniqueSlideFileName,
  uniqueSlideId,
  writeProjectYaml,
} from "./project-files.mjs";
import { createVaultStore } from "./vault-store.mjs";

export function createProjectStore({ userDataPath, envStatus }) {
  const vaultStore = createVaultStore({
    canonicalTaskDir,
    userDataPath,
  });

  async function listVaultProjects() {
    return vaultStore.listProjects();
  }

  async function createProjectAt(parentDir, projectName) {
    const name = String(projectName ?? "").trim();
    if (!name) {
      throw new Error("Project name is required.");
    }

    const canonicalParent = await canonicalTaskDir(parentDir);
    const projectDir = path.join(canonicalParent, sanitizeProjectFolderName(name));
    await assertProjectDoesNotExist(projectDir);

    await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "output"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "slides"), { recursive: true });
    await writeProjectYaml(projectDir, defaultProjectConfig(name));
    await fs.writeFile(path.join(projectDir, "slides", "001-cover.md"), defaultSlideMarkdown(name));

    const task = await loadTaskFolderInner(projectDir);
    await vaultStore.addProject(projectDir);
    return task;
  }

  async function openProject(taskPath) {
    const task = await loadTaskFolderInner(taskPath);
    await vaultStore.addProject(task.path);
    return task;
  }

  async function loadTaskFolder(taskPath) {
    const task = await loadTaskFolderInner(taskPath);
    await vaultStore.addProject(task.path);
    return task;
  }

  async function saveProjectConfig(taskPath, projectConfig) {
    const taskDir = await canonicalTaskDir(taskPath);
    await writeProjectYaml(taskDir, normalizeProjectConfig(projectConfig));
    return loadTaskFolderInner(taskDir);
  }

  async function saveSlideFile(taskPath, fileName, markdown, projectConfig) {
    const taskDir = await canonicalTaskDir(taskPath);
    if (projectConfig) {
      await writeProjectYaml(taskDir, normalizeProjectConfig(projectConfig));
    }
    parseSlideMarkdown(String(markdown ?? ""));
    const slidePath = await safeSlideFilePath(taskDir, fileName);
    await fs.writeFile(slidePath, String(markdown ?? ""));
    return loadTaskFolderInner(taskDir);
  }

  async function createSlideFile(taskPath, layout) {
    const taskDir = await canonicalTaskDir(taskPath);
    const project = await readProjectConfig(taskDir);
    const slideFiles = await readSlideFiles(taskDir);
    const safeLayout = LAYOUT_IDS.has(layout) ? layout : "bullet-list";
    const fileName = await uniqueSlideFileName(taskDir, slideFiles.length + 1, safeLayout);
    await fs.writeFile(
      path.join(taskDir, "slides", fileName),
      slideMarkdown(
        {
          id: uniqueSlideId(
            safeLayout,
            slideFiles.map((slideFile) => slideFile.slide.id),
          ),
          layout: safeLayout,
          title: layoutTitle(safeLayout),
        },
        defaultMarkdownBodyForLayout(safeLayout, project.title),
      ),
    );
    return loadTaskFolderInner(taskDir);
  }

  async function duplicateSlideFile(taskPath, fileName, markdown) {
    const taskDir = await canonicalTaskDir(taskPath);
    const slideFiles = await readSlideFiles(taskDir);
    const sourceMarkdown =
      typeof markdown === "string" && markdown.trim()
        ? markdown
        : await fs.readFile(await safeSlideFilePath(taskDir, fileName), "utf8");
    const parsed = parseSlideMarkdown(sourceMarkdown);
    const duplicateFrontmatter = {
      ...parsed.frontmatter,
      id: uniqueSlideId(
        `${parsed.frontmatter.id}-copy`,
        slideFiles.map((slideFile) => slideFile.slide.id),
      ),
      title: `${parsed.frontmatter.title} Copy`,
    };
    const nextFileName = await uniqueSlideFileName(
      taskDir,
      slideFiles.length + 1,
      duplicateFrontmatter.layout,
    );
    await fs.writeFile(
      path.join(taskDir, "slides", nextFileName),
      slideMarkdown(duplicateFrontmatter, parsed.body),
    );
    return loadTaskFolderInner(taskDir);
  }

  async function deleteSlideFile(taskPath, fileName) {
    const taskDir = await canonicalTaskDir(taskPath);
    const slideFiles = await readSlideFiles(taskDir);
    if (slideFiles.length <= 1) {
      throw new Error("A project must keep at least one slide.");
    }
    await fs.rm(await safeSlideFilePath(taskDir, fileName));
    return loadTaskFolderInner(taskDir);
  }

  async function importAssetFiles(taskPath, sourcePaths) {
    const taskDir = await canonicalTaskDir(taskPath);
    await importAssetsIntoProject(taskDir, sourcePaths);
    return loadTaskFolderInner(taskDir);
  }

  async function loadTaskFolderInner(taskPath) {
    const taskDir = await canonicalTaskDir(taskPath);
    const projectConfig = await readProjectConfig(taskDir);
    const slideFiles = await readSlideFiles(taskDir);
    const assets = await scanAssets(taskDir);
    const { referencedAssets, missingAssetRefs } = await resolveReferencedAssets(
      taskDir,
      slideFiles,
      assets,
    );

    return {
      path: taskDir,
      name: path.basename(taskDir) || "Untitled task",
      projectConfig,
      slides: slideFiles,
      deck: deckFromProjectFiles(projectConfig, slideFiles, assets),
      assets,
      referencedAssets,
      missingAssetRefs,
      envStatus: envStatus
        ? await envStatus()
        : { hasKey: false, hasModel: false, message: "AI status unavailable." },
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

  async function assembleDeckSpec(taskDir) {
    const projectConfig = await readProjectConfig(taskDir);
    const slideFiles = await readSlideFiles(taskDir);
    const assets = await scanAssets(taskDir);
    return deckFromProjectFiles(projectConfig, slideFiles, assets);
  }

  return {
    assembleDeckSpec,
    canonicalTaskDir,
    createProjectAt,
    createSlideFile,
    deleteSlideFile,
    duplicateSlideFile,
    importAssetFiles,
    listVaultProjects,
    loadTaskFolder,
    loadTaskFolderInner,
    openProject,
    saveProjectConfig,
    saveSlideFile,
  };
}

async function assertProjectDoesNotExist(projectDir) {
  try {
    await fs.access(projectDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  throw new Error(`Project folder already exists: ${projectDir}`);
}

async function resolveReferencedAssets(taskDir, slideFiles, assets) {
  const refs = extractAssetRefs(slideFiles.map((slideFile) => slideFile.markdown).join("\n"));
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

  return { missingAssetRefs, referencedAssets };
}
