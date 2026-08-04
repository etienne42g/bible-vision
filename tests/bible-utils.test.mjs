import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReference,
  formatVerseRanges,
  groupConsecutiveNumbers,
  parseReference,
} from "../lib/bible.ts";
import { withoutSentImport } from "../lib/ancre.ts";

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
