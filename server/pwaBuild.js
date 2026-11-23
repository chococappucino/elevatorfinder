import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const workerTemplate = new URL("./serviceWorker.js", import.meta.url);
const publicShell = [
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

export function appShell() {
  let base = "/";
  return {
    name: "elevatorfinder-app-shell",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    async writeBundle({ dir }, bundle) {
      const assets = Object.keys(bundle).filter((file) => /\.(?:js|css)$/.test(file));
      const files = [...publicShell, ...assets].sort();
      const source = await readFile(workerTemplate, "utf8");
      const contents = await Promise.all(files.map((file) => readFile(join(dir, file))));
      const revision = createHash("sha256").update(source);
      files.forEach((file, index) => {
        revision.update(file).update(contents[index]);
      });
      const version = revision.digest("hex").slice(0, 20);
      const paths = files.map((file) => `${base}${file}`);
      await writeFile(join(dir, "sw.js"), [
        `const SHELL_VERSION = ${JSON.stringify(version)};`,
        `const SHELL_PATHS = ${JSON.stringify(paths)};`,
        source,
      ].join("\n"));
    },
  };
}
