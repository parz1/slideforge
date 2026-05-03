import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

export async function readYamlFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return yaml.load(raw);
}

export async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function writeOutputFiles(
  outDir: string,
  files: Array<{ path: string; content: string }>,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const target = join(outDir, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }),
  );
}
