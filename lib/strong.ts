export type StrongReference = {
  bookCode: string;
  chapter: number;
  verses: number[];
};

export type StrongEntry = {
  id: string;
  original: string;
  transliteration: string;
  kind: string;
  definition: string;
  definitionLanguage?: "fr" | "en";
  translations: string;
  occurrences: string;
  references: StrongReference[];
};

export type StrongVerseGroup = [id: string, words: string[]];

export type StrongBookData = {
  code: string;
  chapters: Record<string, Record<string, StrongVerseGroup[]>>;
};

export type StrongLexiconTuple = [
  original: string,
  transliteration: string,
  morphology: string,
  gloss: string,
];

export type StrongLexicon = Record<string, StrongLexiconTuple>;

export const strongEntries: StrongEntry[] = [
  {
    id: "G25",
    original: "ἀγαπάω",
    transliteration: "agapaō",
    kind: "verbe grec",
    definition:
      "Aimer, accueillir avec affection et rechercher activement le bien d’une personne.",
    translations: "aimer · chérir · accueillir avec affection",
    occurrences: "Jean 3:16 · Jean 13:34 · Romains 8:37",
    references: [
      { bookCode: "JHN", chapter: 3, verses: [16] },
      { bookCode: "JHN", chapter: 13, verses: [34] },
      { bookCode: "ROM", chapter: 8, verses: [37] },
    ],
  },
  {
    id: "G26",
    original: "ἀγάπη",
    transliteration: "agapē",
    kind: "nom grec",
    definition:
      "Amour qui se donne, bienveillance et attachement exprimés en actes.",
    translations: "amour · charité · bienveillance",
    occurrences: "1 Corinthiens 13 · 1 Jean 4:8",
    references: [
      { bookCode: "1CO", chapter: 13, verses: [1, 2, 3, 4, 8, 13] },
      { bookCode: "1JN", chapter: 4, verses: [8] },
    ],
  },
  {
    id: "H7462",
    original: "רָעָה",
    transliteration: "rāʿâ",
    kind: "verbe hébreu",
    definition:
      "Faire paître, conduire et prendre soin d’un troupeau ; par extension, accompagner.",
    translations: "faire paître · conduire · être berger",
    occurrences: "Psaume 23:1 · Ézéchiel 34:15",
    references: [
      { bookCode: "PSA", chapter: 23, verses: [1] },
      { bookCode: "EZK", chapter: 34, verses: [15] },
    ],
  },
  {
    id: "H2617",
    original: "חֶסֶד",
    transliteration: "ḥesed",
    kind: "nom hébreu",
    definition:
      "Bonté fidèle, grâce et loyauté durable au sein d’une alliance.",
    translations: "bonté · grâce · fidélité · miséricorde",
    occurrences: "Psaume 23:6 · Psaume 136",
    references: [
      { bookCode: "PSA", chapter: 23, verses: [6] },
      {
        bookCode: "PSA",
        chapter: 136,
        verses: Array.from({ length: 26 }, (_, index) => index + 1),
      },
    ],
  },
];

export function findStrongEntriesForSelection(
  bookCode: string,
  chapter: number,
  verses: number[],
) {
  const selected = new Set(verses);
  return strongEntries.filter((entry) =>
    entry.references.some(
      (reference) =>
        reference.bookCode === bookCode &&
        reference.chapter === chapter &&
        reference.verses.some((verse) => selected.has(verse)),
    ),
  );
}

const strongBookCache = new Map<string, Promise<StrongBookData>>();
let strongLexiconPromise: Promise<StrongLexicon> | null = null;

export function loadStrongBook(bookCode: string) {
  const code = bookCode.toUpperCase();
  const cached = strongBookCache.get(code);
  if (cached) return cached;
  const request = fetch(`/strong/lsg/${code}.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Données Strong indisponibles (${response.status}).`);
      }
      return response.json() as Promise<StrongBookData>;
    })
    .catch((error) => {
      strongBookCache.delete(code);
      throw error;
    });
  strongBookCache.set(code, request);
  return request;
}

export function loadStrongLexicon() {
  if (!strongLexiconPromise) {
    strongLexiconPromise = fetch("/strong/lexicon.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Lexique Strong indisponible (${response.status}).`);
        }
        return response.json() as Promise<StrongLexicon>;
      })
      .catch((error) => {
        strongLexiconPromise = null;
        throw error;
      });
  }
  return strongLexiconPromise;
}

function describeMorphology(id: string, morphology: string) {
  const language = id.startsWith("H") ? "hébreu" : "grec";
  const markers: Array<[RegExp, string]> = [
    [/:ADV/u, "adverbe"],
    [/:PREP/u, "préposition"],
    [/:V/u, "verbe"],
    [/:N/u, "nom"],
    [/:A/u, "adjectif"],
    [/:PRON/u, "pronom"],
    [/:T/u, "article"],
  ];
  const kind = markers.find(([pattern]) => pattern.test(morphology))?.[1] ?? "mot";
  return `${kind} ${language}`;
}

export function resolveStrongEntriesForSelection(
  book: StrongBookData,
  lexicon: StrongLexicon,
  chapter: number,
  verses: number[],
) {
  const groups = new Map<
    string,
    { words: Set<string>; verses: Set<number> }
  >();

  for (const verse of [...new Set(verses)].sort((a, b) => a - b)) {
    for (const [id, words] of book.chapters[String(chapter)]?.[String(verse)] ?? []) {
      const group =
        groups.get(id) ?? { words: new Set<string>(), verses: new Set<number>() };
      words.forEach((word) => group.words.add(word));
      group.verses.add(verse);
      groups.set(id, group);
    }
  }

  return Array.from(groups, ([id, group]): StrongEntry => {
    const [original = "", transliteration = "", morphology = "", gloss = ""] =
      lexicon[id] ?? [];
    const matchedVerses = [...group.verses].sort((a, b) => a - b);
    return {
      id,
      original,
      transliteration,
      kind: describeMorphology(id, morphology),
      definition: gloss || "Glose lexicale non disponible.",
      definitionLanguage: "en",
      translations:
        [...group.words].join(" · ") || "Aucune forme originale associée.",
      occurrences: `${book.code} ${chapter}:${matchedVerses.join(", ")}`,
      references: [
        { bookCode: book.code, chapter, verses: matchedVerses },
      ],
    };
  });
}
