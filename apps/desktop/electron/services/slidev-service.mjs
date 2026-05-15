import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import net from "node:net";
import path from "node:path";
import yaml from "js-yaml";

export function createSlidevService({
  assembleDeckSpec,
  findWorkspaceRoot,
  validateDeckCandidate,
}) {
  let deckPreviewProcess = null;
  let activePreviewProcess = null;
  let activePreviewUrl = null;
  let activePreviewDir = null;

  async function buildTaskDeck(taskDir) {
    const workspaceRoot = findWorkspaceRoot();
    const { slidevDir, log: buildLog } = await compileTaskDeck(taskDir);
    let log = buildLog;

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

  async function previewTaskDeck(taskDir) {
    const workspaceRoot = findWorkspaceRoot();
    const { slidevDir, log } = await compileTaskDeck(taskDir);
    const slidesPath = path.join(slidevDir, "slides.md");
    const port = await findAvailablePort(3030);
    const urls = previewUrls(port);
    const previousProcess = deckPreviewProcess;

    const previewProcess = spawnSlidev(workspaceRoot, slidesPath, port);
    deckPreviewProcess = previewProcess;
    previewProcess.on("close", () => {
      if (deckPreviewProcess === previewProcess) {
        deckPreviewProcess = null;
      }
    });
    try {
      await waitForAnyHttp(urls);
    } catch (error) {
      const details = previewProcess.outputLog
        ? `\n\nSlidev output:\n${previewProcess.outputLog}`
        : "";
      if (!previewProcess.killed) {
        previewProcess.kill();
      }
      if (deckPreviewProcess === previewProcess) {
        deckPreviewProcess = previousProcess;
      }
      throw new Error(`${error.message}${details}`);
    }
    if (previousProcess && previousProcess !== previewProcess && !previousProcess.killed) {
      previousProcess.kill();
    }

    return {
      slidevDir,
      url: urls[0],
      warnings: [],
      log,
    };
  }

  async function previewActiveSlide(taskDir, deck) {
    const validationErrors = validateDeckCandidate(deck);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join("; "));
    }
    if (!Array.isArray(deck.slides) || deck.slides.length !== 1) {
      throw new Error("Active slide preview expects exactly one slide.");
    }

    const workspaceRoot = findWorkspaceRoot();
    const slidevDir = path.join(taskDir, "output", "active-preview");
    const samePreviewDir = activePreviewDir === slidevDir;
    const hasRunningPreview =
      samePreviewDir && activePreviewProcess && !activePreviewProcess.killed && activePreviewUrl;
    const { log } = await compileDeckSpecToSlidev(taskDir, deck, slidevDir, {
      clean: !hasRunningPreview,
    });
    const slidesPath = path.join(slidevDir, "slides.md");

    if (hasRunningPreview) {
      return {
        slidevDir,
        url: activePreviewUrl,
        warnings: [],
        log,
      };
    }

    const port = await findAvailablePort(3130);
    const urls = previewUrls(port);
    const previousProcess = activePreviewProcess;
    const previousUrl = activePreviewUrl;
    const previousDir = activePreviewDir;

    const previewProcess = spawnSlidev(workspaceRoot, slidesPath, port);
    activePreviewProcess = previewProcess;
    activePreviewUrl = urls[0];
    activePreviewDir = slidevDir;
    previewProcess.on("close", () => {
      if (activePreviewProcess === previewProcess) {
        activePreviewProcess = null;
        activePreviewUrl = null;
        activePreviewDir = null;
      }
    });
    try {
      const readyUrl = await waitForAnyHttp(urls);
      activePreviewUrl = readyUrl;
    } catch (error) {
      const details = previewProcess.outputLog
        ? `\n\nSlidev output:\n${previewProcess.outputLog}`
        : "";
      if (!previewProcess.killed) {
        previewProcess.kill();
      }
      if (activePreviewProcess === previewProcess) {
        activePreviewProcess = previousProcess;
        activePreviewUrl = previousUrl;
        activePreviewDir = previousDir;
      }
      throw new Error(`${error.message}${details}`);
    }
    if (previousProcess && previousProcess !== previewProcess && !previousProcess.killed) {
      previousProcess.kill();
    }

    return {
      slidevDir,
      url: activePreviewUrl,
      warnings: [],
      log,
    };
  }

  async function compileTaskDeck(taskDir) {
    const deck = await assembleDeckSpec(taskDir);
    const validationErrors = validateDeckCandidate(deck);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join("; "));
    }

    const slidevDir = path.join(taskDir, "output", "slidev");
    return compileDeckSpecToSlidev(taskDir, deck, slidevDir, { clean: true });
  }

  async function compileDeckSpecToSlidev(taskDir, deck, slidevDir, options = {}) {
    const workspaceRoot = findWorkspaceRoot();
    if (options.clean !== false) {
      await fs.rm(slidevDir, { recursive: true, force: true });
    }
    await fs.mkdir(slidevDir, { recursive: true });
    const buildDeckPath = path.join(slidevDir, "deck.generated.yaml");
    await writeDeckYamlFile(buildDeckPath, deck);

    const buildOutput = await runCommand(
      "pnpm",
      ["exec", "tsx", "packages/compiler/src/cli.ts", "build", buildDeckPath, "--out", slidevDir],
      workspaceRoot,
    );
    const log = commandOutputToLog(buildOutput);
    if (buildOutput.code !== 0) {
      throw new Error(`Deck build failed:\n${log}`);
    }

    await copyTaskAssets(taskDir, slidevDir);
    await linkSlidevRuntime(workspaceRoot, slidevDir);
    return { slidevDir, log };
  }

  return {
    buildTaskDeck,
    previewActiveSlide,
    previewTaskDeck,
  };
}

function spawnSlidev(workspaceRoot, slidesPath, port) {
  const previewProcess = spawn("pnpm", ["exec", "slidev", slidesPath, "--port", String(port)], {
    cwd: workspaceRoot,
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  attachProcessLogBuffer(previewProcess);
  return previewProcess;
}

function previewUrls(port) {
  return [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`];
}

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => tryPort(port + 1));
      server.listen({ host: "127.0.0.1", port }, () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(startPort);
  });
}

async function waitForAnyHttp(urls) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    for (const url of urls) {
      try {
        const response = await fetch(url, { method: "GET" });
        if (response.ok) {
          return url;
        }
        lastError = new Error(`${url} HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(
    `Timed out waiting for Slidev preview at ${urls.join(" or ")}${lastError ? ` (${lastError.message})` : ""}`,
  );
}

function attachProcessLogBuffer(child) {
  child.outputLog = "";
  const append = (chunk) => {
    child.outputLog = `${child.outputLog}${String(chunk)}`.slice(-6000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
}

async function linkSlidevRuntime(workspaceRoot, slidevDir) {
  const themeSource = path.join(workspaceRoot, "node_modules", "@slidev", "theme-seriph");
  if (!fsSync.existsSync(themeSource)) {
    return;
  }
  const themeTarget = path.join(slidevDir, "node_modules", "@slidev", "theme-seriph");
  await fs.mkdir(path.dirname(themeTarget), { recursive: true });
  await fs.rm(themeTarget, { recursive: true, force: true });
  await fs.symlink(themeSource, themeTarget, "dir");
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

async function writeDeckYamlFile(deckPath, deck) {
  const output = yaml.dump(deck, {
    noRefs: true,
    lineWidth: 100,
  });
  await fs.writeFile(deckPath, output);
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
  return [output.stdout, output.stderr].filter(Boolean).join("\n").trim();
}
