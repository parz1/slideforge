import { spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";

const processes = [];
const rendererHost = "127.0.0.1";
const rendererPort = Number(process.env.SLIDEFORGE_RENDERER_PORT ?? 1420);
const rendererUrl = `http://${rendererHost}:${rendererPort}`;

const slidevPort = String(
  await findAvailablePort(
    Number(process.env.SLIDEFORGE_SLIDEV_PORT ?? 3030),
    "localhost",
  ),
);

const build = run("pnpm", ["build:trial"], "build");

build.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const vite = run(
    "pnpm",
    ["--filter", "@slideforge/desktop", "dev"],
    "vite",
  );
  processes.push(vite);

  waitForPort(rendererPort, rendererHost)
    .then(() => {
      if (process.exitCode !== undefined) {
        return;
      }
      processes.push(
        run(
          "pnpm",
          ["--filter", "@slideforge/desktop", "dev:electron"],
          "electron",
          {
            SLIDEFORGE_RENDERER_URL: rendererUrl,
            SLIDEFORGE_DESKTOP_DEV: "1",
          },
        ),
      );
    })
    .catch((error) => {
      console.error(`[electron] renderer did not become ready: ${error.message}`);
      shutdown(1);
    });

  processes.push(
    run(
      "slidev",
      [".slideforge/build/slides.md", "--port", slidevPort],
      "slidev",
    ),
  );

  console.log("");
  console.log("Slideforge dev is starting:");
  console.log("  Desktop app:       Electron window");
  console.log(`  Renderer:          ${rendererUrl}/`);
  console.log(`  Slidev preview:    http://localhost:${slidevPort}/`);
  console.log("  Press Ctrl+C to stop all servers.");
  console.log("");
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
});

function run(command, args, label, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: false,
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(prefixOutput(label, chunk));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(prefixOutput(label, chunk));
  });

  child.on("error", (error) => {
    console.error(`[${label}] ${error.message}`);
    shutdown();
  });

  child.on("exit", (code) => {
    if (process.exitCode === undefined && code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
}

async function findAvailablePort(startPort, host) {
  let port = startPort;
  while (!(await isPortAvailable(port, host))) {
    port += 1;
  }
  return port;
}

async function waitForPort(port, host, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(port, host)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${host}:${port} timed out`);
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function prefixOutput(label, chunk) {
  return String(chunk)
    .split("\n")
    .map((line, index, lines) => {
      if (index === lines.length - 1 && line === "") {
        return "";
      }
      return `[${label}] ${line}`;
    })
    .join("\n");
}

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}
