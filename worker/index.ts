/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  parseApiBibleChapter,
  parseApiBibleSearchResults,
  type ApiBibleContentNode,
  type ApiBibleSearchVerse,
} from "../lib/api-bible";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  API_BIBLE_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type ApiBibleInfo = {
  id: string;
  abbreviation?: string;
  abbreviationLocal?: string;
  name?: string;
  nameLocal?: string;
  copyright?: string;
  updatedAt?: string;
};

type TimedCache<T> = {
  expiresAt: number;
  value: Promise<T>;
};

const API_BIBLE_BASE = "https://rest.api.bible/v1";
const API_CACHE_TTL = 6 * 60 * 60 * 1000;
let bdsBibleCache: TimedCache<ApiBibleInfo> | null = null;
const chapterCache = new Map<string, TimedCache<unknown>>();

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

async function apiBibleFetch<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${API_BIBLE_BASE}${path}`, {
    headers: { "api-key": apiKey },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      detail = body.message || body.error || "";
    } catch {
      // The status code is enough when the upstream body is not JSON.
    }
    throw new Error(`API.Bible ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json() as Promise<T>;
}

function getCached<T>(
  cache: Map<string, TimedCache<unknown>>,
  key: string,
  loader: () => Promise<T>,
) {
  const now = Date.now();
  const existing = cache.get(key) as TimedCache<T> | undefined;
  if (existing && existing.expiresAt > now) return existing.value;
  const value = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: now + API_CACHE_TTL, value });
  return value;
}

async function resolveBdsBible(apiKey: string) {
  const now = Date.now();
  if (bdsBibleCache && bdsBibleCache.expiresAt > now) {
    return bdsBibleCache.value;
  }

  const value = (async () => {
    const list = await apiBibleFetch<{ data: ApiBibleInfo[] }>(
      "/bibles?language=fra&include-full-details=true",
      apiKey,
    );
    const bible = list.data.find((item) => {
      const abbreviation = `${item.abbreviation ?? ""} ${item.abbreviationLocal ?? ""}`
        .trim()
        .toUpperCase();
      const name = `${item.name ?? ""} ${item.nameLocal ?? ""}`.toLowerCase();
      return abbreviation.split(/\s+/).includes("BDS") || name.includes("semeur");
    });
    if (!bible) {
      throw new Error(
        "La Bible du Semeur n’est pas activée dans votre compte API.Bible.",
      );
    }
    const details = await apiBibleFetch<{ data: ApiBibleInfo }>(
      `/bibles/${encodeURIComponent(bible.id)}`,
      apiKey,
    );
    return { ...bible, ...details.data };
  })().catch((error) => {
    bdsBibleCache = null;
    throw error;
  });

  bdsBibleCache = { expiresAt: now + API_CACHE_TTL, value };
  return value;
}

function apiBibleError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur API.Bible";
  if (/401|403/.test(message)) {
    return jsonResponse(
      { error: "La clé API.Bible est invalide ou ne permet pas l’accès à la BDS." },
      502,
    );
  }
  if (message.includes("n’est pas activée")) {
    return jsonResponse({ error: message }, 404);
  }
  return jsonResponse(
    { error: "La Bible du Semeur est momentanément indisponible." },
    502,
  );
}

async function handleApiBible(request: Request, env?: Env) {
  const apiKey =
    env?.API_BIBLE_KEY ||
    (typeof process !== "undefined" ? process.env.API_BIBLE_KEY : undefined);
  if (!apiKey) {
    return jsonResponse(
      { error: "La variable serveur API_BIBLE_KEY n’est pas configurée." },
      503,
    );
  }

  const url = new URL(request.url);
  try {
    const bible = await resolveBdsBible(apiKey);
    if (url.pathname === "/api/bible/bds/chapter") {
      const bookCode = (url.searchParams.get("book") || "").toUpperCase();
      const chapter = Number(url.searchParams.get("chapter"));
      if (!/^(?:[1-3][A-Z]{2}|[A-Z]{3})$/.test(bookCode) || chapter < 1 || chapter > 150) {
        return jsonResponse({ error: "Référence biblique invalide." }, 400);
      }

      const cacheKey = `${bible.id}:${bookCode}.${chapter}`;
      const payload = await getCached(chapterCache, cacheKey, async () => {
        const result = await apiBibleFetch<{
          data: {
            content: ApiBibleContentNode[] | string;
            copyright?: string;
          };
          meta?: { fumsToken?: string };
        }>(
          `/bibles/${encodeURIComponent(bible.id)}/chapters/${bookCode}.${chapter}?content-type=json&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&fums-version=3`,
          apiKey,
        );
        return {
          bookCode,
          chapter,
          verses: parseApiBibleChapter(result.data.content),
          copyright: result.data.copyright || bible.copyright || "© Biblica, Inc.",
          fumsToken: result.meta?.fumsToken,
          bible: {
            name: bible.nameLocal || bible.name || "La Bible du Semeur",
            abbreviation:
              bible.abbreviationLocal || bible.abbreviation || "BDS",
          },
        };
      });
      return jsonResponse(payload);
    }

    if (url.pathname === "/api/bible/bds/search") {
      const query = (url.searchParams.get("q") || "").trim();
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 100));
      if (query.length < 2 || query.length > 100) {
        return jsonResponse({ error: "La recherche doit contenir entre 2 et 100 caractères." }, 400);
      }
      const result = await apiBibleFetch<{
        data: { verses?: ApiBibleSearchVerse[] };
        meta?: { fumsToken?: string };
      }>(
        `/bibles/${encodeURIComponent(bible.id)}/search?query=${encodeURIComponent(query)}&limit=${limit}&sort=canonical&fums-version=3`,
        apiKey,
      );
      return jsonResponse({
        results: parseApiBibleSearchResults(result.data.verses ?? []),
        fumsToken: result.meta?.fumsToken,
      });
    }

    return jsonResponse({ error: "Route API.Bible inconnue." }, 404);
  } catch (error) {
    return apiBibleError(error);
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const webManifest = {
  name: "Bible Vision — Lire, étudier, mémoriser",
  short_name: "Bible Vision",
  description: "Une Bible d’étude personnelle connectée à Ancre.",
  lang: "fr",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#f7f3ea",
  theme_color: "#254f43",
  categories: ["books", "education", "lifestyle"],
  icons: [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/bible/bds/")) {
      return handleApiBible(request, env);
    }

    if (url.pathname === "/manifest.webmanifest") {
      return new Response(JSON.stringify(webManifest), {
        headers: {
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
