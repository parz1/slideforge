import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  IMAGE_EXTENSIONS,
  MAX_TEXT_ASSET_BYTES,
  TEXT_EXTENSIONS,
} from "../domain/deck-constants.mjs";
import { sanitizeProjectFolderName } from "./project-files.mjs";

export async function importAssetFiles(taskDir, sourcePaths) {
  const assetsDir = path.join(taskDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  for (const sourcePath of sourcePaths) {
    const stat = await fs.stat(sourcePath).catch(() => null);
    if (!stat?.isFile() || !assetKind(sourcePath)) {
      continue;
    }
    const destination = await uniqueDestinationPath(assetsDir, path.basename(sourcePath));
    await fs.copyFile(sourcePath, destination);
  }
}

export async function scanAssets(taskDir) {
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

export function extractAssetRefs(text) {
  const refs = new Set();
  const matcher = /@((?:assets\/)[^\s)\]}"'>,;]+)/g;
  for (const match of text.matchAll(matcher)) {
    const candidate = match[1];
    if (isSafeRelativeAssetPath(candidate)) {
      refs.add(candidate);
    }
  }
  return [...refs].sort();
}

export async function readReferencedAsset(taskDir, asset) {
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

async function uniqueDestinationPath(dir, filename) {
  const parsed = path.parse(filename);
  const safeBase = sanitizeProjectFolderName(parsed.name) || "asset";
  const extension = parsed.ext.toLowerCase();
  let candidate = path.join(dir, `${safeBase}${extension}`);
  let index = 2;
  while (fsSync.existsSync(candidate)) {
    candidate = path.join(dir, `${safeBase}-${index}${extension}`);
    index += 1;
  }
  return candidate;
}
