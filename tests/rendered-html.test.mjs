import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Bible Vision application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="fr">/i);
  assert.match(html, /<title>Bible Vision — Lire, étudier, mémoriser<\/title>/i);
  assert.match(html, /Bible Vision/);
  assert.match(html, /Jean/);
  assert.match(html, /Mémoriser avec Ancre/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /og-v2\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships the installable PWA assets and removes the starter preview", async () => {
  const [manifestRaw, serviceWorker, page, packageJson] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.short_name, "Bible Vision");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 2);
  assert.match(serviceWorker, /bible-vision-/);
  assert.match(serviceWorker, /offline\.html/);
  assert.match(page, /loadLocalState/);
  assert.match(page, /serviceWorker\.register/);
  assert.match(page, /memoryverses\.etiennegrz\.fr/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-live="polite"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await Promise.all([
    access(new URL("../public/icon-192.png", import.meta.url)),
    access(new URL("../public/icon-512.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/og-v2.png", import.meta.url)),
  ]);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
