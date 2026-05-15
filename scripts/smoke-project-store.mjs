import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProjectStore } from "../apps/desktop/electron/services/project-store.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "slideforge-project-store-"));
const store = createProjectStore({
  envStatus: async () => ({ hasKey: false, hasModel: false, message: "smoke" }),
  userDataPath: () => path.join(root, "user-data"),
});

try {
  let task = await store.createProjectAt(root, "Smoke Course");
  assert(task.slides.length === 1, "createProjectAt should create one default slide");
  assert(task.projectConfig.title === "Smoke Course", "project title should match requested name");

  task = await store.createSlideFile(task.path, "two-column");
  assert(task.slides.length === 2, "createSlideFile should add a slide");
  assert(
    task.slides[1].frontmatter.layout === "two-column",
    "created slide should use requested layout",
  );

  task = await store.duplicateSlideFile(
    task.path,
    task.slides[1].fileName,
    task.slides[1].markdown,
  );
  assert(task.slides.length === 3, "duplicateSlideFile should copy the active slide");

  task = await store.deleteSlideFile(task.path, task.slides[2].fileName);
  assert(task.slides.length === 2, "deleteSlideFile should remove the selected slide");

  const deck = await store.assembleDeckSpec(task.path);
  assert(deck.meta.title === "Smoke Course", "assembled deck should keep project metadata");
  assert(deck.slides.length === 2, "assembled deck should include current slides");

  console.log(`project-store smoke passed: ${deck.slides.length} slides`);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
