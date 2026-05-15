import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export function createVaultStore({ canonicalTaskDir, userDataPath }) {
  async function listProjects() {
    const vault = await readVault();
    return {
      projects: vault.projects,
    };
  }

  async function addProject(projectDir) {
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

  async function readVault() {
    const vaultFile = vaultPath();
    if (!fsSync.existsSync(vaultFile)) {
      return { projects: [] };
    }
    const raw = await fs.readFile(vaultFile, "utf8");
    const data = JSON.parse(raw);
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    for (const project of data.projects) {
      project.exists =
        fsSync.existsSync(project.path) && fsSync.statSync(project.path).isDirectory();
    }
    return data;
  }

  async function writeVault(data) {
    const vaultFile = vaultPath();
    await fs.mkdir(path.dirname(vaultFile), { recursive: true });
    await fs.writeFile(vaultFile, `${JSON.stringify(data, null, 2)}\n`);
  }

  function vaultPath() {
    return path.join(userDataPath(), "vault.json");
  }

  return {
    addProject,
    listProjects,
  };
}
