import { parseArgs } from "node:util";
import { assertDeckSpec, validateDeckSpec } from "./validation";
import { readJsonFile, readYamlFile, writeOutputFiles } from "./io";
import { renderSlidev } from "./render-slidev";

async function main() {
  const [command, inputPath, ...rest] = process.argv.slice(2);

  if (!command || !inputPath) {
    printUsageAndExit();
  }

  const options = parseArgs({
    args: rest,
    options: {
      schema: { type: "string" },
      out: { type: "string" },
    },
    allowPositionals: false,
  }).values;

  const schemaPath = options.schema ?? "schemas/deck.schema.json";
  const schema = await readJsonFile(schemaPath);
  const spec = await readYamlFile(inputPath);
  const validation = validateDeckSpec(spec, schema);

  if (!validation.ok) {
    console.error("Deck Spec validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (command === "validate") {
    console.log(`Deck Spec is valid: ${inputPath}`);
    return;
  }

  if (command === "build") {
    assertDeckSpec(spec);
    const rendered = renderSlidev(spec);
    const outDir = options.out ?? ".slideforge/build";
    await writeOutputFiles(outDir, rendered.files);
    console.log(`Rendered Slidev project to ${outDir}`);
    return;
  }

  printUsageAndExit();
}

function printUsageAndExit(): never {
  console.error([
    "Usage:",
    "  tsx packages/compiler/src/cli.ts validate <deck.yaml> --schema <schema.json>",
    "  tsx packages/compiler/src/cli.ts build <deck.yaml> --out <out-dir>",
  ].join("\n"));
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
