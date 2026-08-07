export type TranslationId = "LSG" | "DARBY" | "BDS";

export type TranslationMetadata = {
  id: TranslationId;
  translationId: "fra_lsg" | "fra_jnd" | "api_bible_bds";
  name: string;
  abbreviation: string;
  language: string;
  source: string;
  sourceUrl: string;
  licenseUrl: string;
  license: string;
  offline: boolean;
  sha256: string;
  importedAt: string;
};

export type BibleBook = {
  code: string;
  name: string;
  singular: string;
  testament: "AT" | "NT";
  aliases: string[];
  chapters: number;
};

export type BibleCatalog = {
  updatedAt: string;
  translations: TranslationMetadata[];
  books: BibleBook[];
};

export type BibleData = {
  metadata: TranslationMetadata;
  books: Record<string, string[][]>;
  copyright?: string;
  fumsToken?: string;
};

export type ParsedReference = {
  book: BibleBook;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
};

export type SearchResult = {
  book: BibleBook;
  chapter: number;
  verse: number;
  text: string;
};

type ApiBibleChapterResponse = {
  bookCode: string;
  chapter: number;
  verses: string[];
  copyright: string;
  fumsToken?: string;
  bible: {
    name: string;
    abbreviation: string;
  };
};

type ApiBibleSearchResponse = {
  results: Array<{
    bookCode: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  fumsToken?: string;
};

const dataCache = new Map<string, Promise<BibleData>>();

const bdsMetadata: TranslationMetadata = {
  id: "BDS",
  translationId: "api_bible_bds",
  name: "La Bible du Semeur",
  abbreviation: "BDS",
  language: "fr",
  source: "Biblica via API.Bible",
  sourceUrl: "https://www.biblica.com/bible/bds/",
  licenseUrl: "https://www.biblica.com/permissions/",
  license: "© Biblica, Inc. · usage non commercial",
  offline: false,
  sha256: "",
  importedAt: "",
};

export function normalizeBibleText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function loadBibleCatalog(): Promise<BibleCatalog> {
  const response = await fetch("/bibles/catalog.json");
  if (!response.ok) throw new Error("Le catalogue biblique est indisponible.");
  return response.json() as Promise<BibleCatalog>;
}

export function loadBible(
  translation: TranslationId,
  bookCode?: string,
  chapter?: number,
): Promise<BibleData> {
  const cacheKey =
    translation === "BDS" ? `${translation}:${bookCode}:${chapter}` : translation;
  const existing = dataCache.get(cacheKey);
  if (existing) return existing;

  const request =
    translation === "BDS"
      ? loadApiBibleChapter(bookCode, chapter)
      : fetch(`/bibles/${translation === "LSG" ? "lsg" : "darby"}.json`).then(
          async (response) => {
            if (!response.ok) {
              throw new Error(`La traduction ${translation} est indisponible.`);
            }
            return response.json() as Promise<BibleData>;
          },
        );

  const cachedRequest = request.catch((error) => {
    dataCache.delete(cacheKey);
    throw error;
  });
  dataCache.set(cacheKey, cachedRequest);
  return cachedRequest;
}

async function loadApiBibleChapter(bookCode?: string, chapter?: number) {
  if (!bookCode || !chapter) {
    throw new Error("Le livre et le chapitre sont requis pour la BDS.");
  }

  const response = await fetch(
    `/api/bible/bds/chapter?book=${encodeURIComponent(bookCode)}&chapter=${chapter}`,
  );
  const payload = (await response.json()) as ApiBibleChapterResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "La Bible du Semeur est indisponible.");
  }

  const chapters: string[][] = [];
  chapters[chapter - 1] = payload.verses;
  return {
    metadata: {
      ...bdsMetadata,
      name: payload.bible.name || bdsMetadata.name,
      abbreviation: payload.bible.abbreviation || bdsMetadata.abbreviation,
    },
    books: { [bookCode]: chapters },
    copyright: payload.copyright,
    fumsToken: payload.fumsToken,
  } satisfies BibleData;
}

export async function searchApiBible(
  catalog: BibleCatalog,
  query: string,
  limit = 100,
) {
  const response = await fetch(
    `/api/bible/bds/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const payload = (await response.json()) as ApiBibleSearchResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "La recherche BDS est indisponible.");
  }

  const books = new Map(catalog.books.map((book) => [book.code, book]));
  return {
    results: payload.results.flatMap((result) => {
      const book = books.get(result.bookCode);
      return book ? [{ ...result, book }] : [];
    }),
    fumsToken: payload.fumsToken,
  };
}

export function mergeBibleData(
  current: BibleData | undefined,
  incoming: BibleData,
) {
  if (!current) return incoming;

  const books = { ...current.books };
  for (const [bookCode, incomingChapters] of Object.entries(incoming.books)) {
    const chapters = [...(books[bookCode] ?? [])];
    incomingChapters.forEach((verses, index) => {
      if (verses) chapters[index] = verses;
    });
    books[bookCode] = chapters;
  }

  return {
    ...current,
    ...incoming,
    books,
  };
}

export function parseReference(
  input: string,
  catalog: BibleCatalog,
): ParsedReference | null {
  const normalized = normalizeBibleText(input)
    .replace(/\s*([:.,])\s*/g, ":")
    .replace(/\s*[-–—]\s*/g, "-");
  const match = normalized.match(
    /^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/,
  );
  if (!match) return null;

  const [, bookInput, chapterRaw, startRaw, endRaw] = match;
  const book = catalog.books
    .flatMap((item) =>
      [item.name, item.singular, ...item.aliases].map((alias) => ({
        item,
        alias: normalizeBibleText(alias),
      })),
    )
    .sort((a, b) => b.alias.length - a.alias.length)
    .find(({ alias }) => alias === bookInput)?.item;
  if (!book) return null;

  const chapter = Number(chapterRaw);
  const startVerse = startRaw ? Number(startRaw) : undefined;
  const endVerse = endRaw ? Number(endRaw) : startVerse;
  if (
    chapter < 1 ||
    chapter > book.chapters ||
    (startVerse !== undefined && startVerse < 1) ||
    (endVerse !== undefined &&
      (endVerse < 1 || (startVerse !== undefined && endVerse < startVerse)))
  ) {
    return null;
  }

  return { book, chapter, startVerse, endVerse };
}

export function groupConsecutiveNumbers(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const groups: Array<{ start: number; end: number }> = [];

  for (const value of unique) {
    const previous = groups.at(-1);
    if (previous && value === previous.end + 1) {
      previous.end = value;
    } else {
      groups.push({ start: value, end: value });
    }
  }

  return groups;
}

export function formatVerseRanges(values: number[]) {
  return groupConsecutiveNumbers(values)
    .map(({ start, end }) => (start === end ? `${start}` : `${start}–${end}`))
    .join(", ");
}

export function formatReference(
  bookName: string,
  chapter: number,
  verses: number[] = [],
) {
  return verses.length
    ? `${bookName} ${chapter}:${formatVerseRanges(verses)}`
    : `${bookName} ${chapter}`;
}

export function searchBible(
  bible: BibleData,
  catalog: BibleCatalog,
  query: string,
  limit = 80,
) {
  const needle = normalizeBibleText(query);
  if (needle.length < 2) return [] as SearchResult[];

  const results: SearchResult[] = [];
  for (const book of catalog.books) {
    const chapters = bible.books[book.code] ?? [];
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
      const verses = chapters[chapterIndex] ?? [];
      for (let verseIndex = 0; verseIndex < verses.length; verseIndex += 1) {
        const text = verses[verseIndex];
        if (!text || !normalizeBibleText(text).includes(needle)) continue;
        results.push({
          book,
          chapter: chapterIndex + 1,
          verse: verseIndex + 1,
          text,
        });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

export function getChapterVerses(
  bible: BibleData | null,
  bookCode: string,
  chapter: number,
) {
  return (bible?.books[bookCode]?.[chapter - 1] ?? [])
    .map((text, index) => ({ n: index + 1, text }))
    .filter((verse) => Boolean(verse.text));
}
