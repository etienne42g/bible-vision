import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatReference,
  formatVerseRanges,
  groupConsecutiveNumbers,
  parseReference,
} from "../lib/bible.ts";
import { withoutSentImport } from "../lib/ancre.ts";
import {
  findStrongEntriesForSelection,
  resolveStrongEntriesForSelection,
} from "../lib/strong.ts";

const catalog = {
  updatedAt: "",
  translations: [],
  books: [
    {
      code: "JHN",
      name: "Jean",
      singular: "Jean",
      testament: "NT",
      aliases: ["jean", "jn"],
      chapters: 21,
    },
    {
      code: "1CO",
      name: "1 Corinthiens",
      singular: "1 Corinthiens",
      testament: "NT",
      aliases: ["1 corinthiens", "1 cor", "1co"],
      chapters: 16,
    },
    {
      code: "PSA",
      name: "Psaumes",
      singular: "Psaume",
      testament: "AT",
      aliases: ["psaume", "psaumes", "ps"],
      chapters: 150,
    },
  ],
};

test("parses French Bible references and ranges", () => {
  assert.deepEqual(parseReference("Jean 3:16-18", catalog), {
    book: catalog.books[0],
    chapter: 3,
    startVerse: 16,
    endVerse: 18,
  });
  assert.equal(parseReference("Jean 3.16", catalog)?.startVerse, 16);
  assert.equal(parseReference("Jean 3,16", catalog)?.startVerse, 16);
  assert.equal(parseReference("1 Corinthiens 13", catalog)?.chapter, 13);
  assert.equal(parseReference("Psaume 23", catalog)?.book.code, "PSA");
  assert.equal(parseReference("Jean 25", catalog), null);
});

test("keeps distinct selections distinct while grouping consecutive verses", () => {
  assert.deepEqual(groupConsecutiveNumbers([18, 16, 17, 21, 21]), [
    { start: 16, end: 18 },
    { start: 21, end: 21 },
  ]);
  assert.equal(formatVerseRanges([16, 17, 18, 21]), "16–18, 21");
  assert.equal(
    formatReference("Jean", 3, [16, 17, 18, 21]),
    "Jean 3:16–18, 21",
  );
});

test("removes a passage from the Ancre queue once it is sent", () => {
  const imports = [
    { externalId: "first", reference: "Jean 3:16" },
    { externalId: "second", reference: "Psaume 23:1" },
  ];

  assert.deepEqual(withoutSentImport(imports, "first"), [imports[1]]);
  assert.deepEqual(withoutSentImport(imports, "missing"), imports);
});

test("finds deduplicated Strong entries for selected verses", () => {
  assert.deepEqual(
    findStrongEntriesForSelection("PSA", 23, [1, 6]).map((entry) => entry.id),
    ["H7462", "H2617"],
  );
  assert.deepEqual(
    findStrongEntriesForSelection("JHN", 3, [16, 16]).map((entry) => entry.id),
    ["G25"],
  );
  assert.deepEqual(findStrongEntriesForSelection("GEN", 1, [1]), []);
});

test("resolves and merges aligned Strong words across selected verses", () => {
  const book = {
    code: "JHN",
    chapters: {
      3: {
        16: [
          ["G2316", ["θεὸς"], ["Dieu"]],
          ["G25", ["ἠγάπησεν"], ["aimé"]],
        ],
        17: [
          ["G2316", ["θεὸς"], ["Dieu"]],
          ["G649", ["ἀπέστειλεν"], ["envoyé"]],
        ],
      },
    },
  };
  const lexicon = {
    G2316: ["θεός", "theos", "G:N", "God"],
    G25: ["ἀγαπάω", "agapaō", "G:V", "to love"],
    G649: ["ἀποστέλλω", "apostellō", "G:V", "to send"],
  };

  const entries = resolveStrongEntriesForSelection(
    book,
    lexicon,
    3,
    [17, 16, 16],
  );

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["G2316", "G25", "G649"],
  );
  assert.equal(entries[0].translations, "Dieu");
  assert.equal(entries[0].originalForms, "θεὸς");
  assert.equal(entries[0].occurrences, "JHN 3:16, 17");
  assert.equal(entries[1].kind, "verbe grec");
  assert.equal(entries[1].definitionLanguage, "en");
});

test("ships verified Strong references for key Greek and Hebrew passages", async () => {
  const [
    catalogRaw,
    johnRaw,
    psalmsRaw,
    chroniclesRaw,
    nahumRaw,
    ecclesiastesRaw,
  ] = await Promise.all([
    readFile(new URL("../public/strong/catalog.json", import.meta.url), "utf8"),
    readFile(new URL("../public/strong/lsg/JHN.json", import.meta.url), "utf8"),
    readFile(new URL("../public/strong/lsg/PSA.json", import.meta.url), "utf8"),
    readFile(new URL("../public/strong/lsg/1CH.json", import.meta.url), "utf8"),
    readFile(new URL("../public/strong/lsg/NAM.json", import.meta.url), "utf8"),
    readFile(new URL("../public/strong/lsg/ECC.json", import.meta.url), "utf8"),
  ]);
  const strongCatalog = JSON.parse(catalogRaw);
  const john = JSON.parse(johnRaw);
  const psalms = JSON.parse(psalmsRaw);
  const chronicles = JSON.parse(chroniclesRaw);
  const nahum = JSON.parse(nahumRaw);
  const ecclesiastes = JSON.parse(ecclesiastesRaw);

  assert.equal(strongCatalog.books.length, 66);
  assert.ok(
    john.chapters["3"]["16"].some(
      ([id, forms, frenchWords]) =>
        id === "G25" &&
        forms.includes("ἠγάπησεν") &&
        frenchWords.includes("aimé"),
    ),
  );
  assert.ok(
    psalms.chapters["23"]["1"].some(
      ([id, forms, frenchWords]) =>
        id === "H7462" &&
        forms.some((form) => form.includes("רֹ")) &&
        frenchWords.includes("berger"),
    ),
  );
  assert.ok(
    chronicles.chapters["1"]["22"].some(
      ([id, forms, frenchWords]) =>
        id === "H211" &&
        forms.some((form) => form.includes("אוֹפִ")) &&
        frenchWords.includes("Ophir"),
    ),
  );
  assert.ok(
    !chronicles.chapters["1"]["23"].some(([id]) => id === "H211"),
  );
  assert.ok(
    nahum.chapters["2"]["1"].some(
      ([id, forms, frenchWords]) =>
        id === "H2009" &&
        forms.some((form) => form.includes("הִנֵּ")) &&
        frenchWords.includes("Voici"),
    ),
  );
  assert.ok(
    ecclesiastes.chapters["12"]["1"].some(
      ([id, forms, frenchWords]) =>
        id === "H8055" &&
        forms.some((form) => form.includes("שְׂמַ")) &&
        frenchWords.includes("réjouis"),
    ),
  );
});
