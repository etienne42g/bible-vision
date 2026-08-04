import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "public", "bibles");

const books = [
  ["GEN", "Genèse", "Genèse", "AT", ["genese", "gen"]],
  ["EXO", "Exode", "Exode", "AT", ["exode", "exo"]],
  ["LEV", "Lévitique", "Lévitique", "AT", ["levitique", "lev"]],
  ["NUM", "Nombres", "Nombres", "AT", ["nombres", "nom", "num"]],
  ["DEU", "Deutéronome", "Deutéronome", "AT", ["deuteronome", "deu", "dt"]],
  ["JOS", "Josué", "Josué", "AT", ["josue", "jos"]],
  ["JDG", "Juges", "Juges", "AT", ["juges", "jug", "jdg"]],
  ["RUT", "Ruth", "Ruth", "AT", ["ruth", "rut"]],
  ["1SA", "1 Samuel", "1 Samuel", "AT", ["1 samuel", "1samuel", "1 sam", "1sa"]],
  ["2SA", "2 Samuel", "2 Samuel", "AT", ["2 samuel", "2samuel", "2 sam", "2sa"]],
  ["1KI", "1 Rois", "1 Rois", "AT", ["1 rois", "1rois", "1 r", "1ki"]],
  ["2KI", "2 Rois", "2 Rois", "AT", ["2 rois", "2rois", "2 r", "2ki"]],
  ["1CH", "1 Chroniques", "1 Chroniques", "AT", ["1 chroniques", "1chroniques", "1 chr", "1ch"]],
  ["2CH", "2 Chroniques", "2 Chroniques", "AT", ["2 chroniques", "2chroniques", "2 chr", "2ch"]],
  ["EZR", "Esdras", "Esdras", "AT", ["esdras", "esd", "ezr"]],
  ["NEH", "Néhémie", "Néhémie", "AT", ["nehemie", "neh"]],
  ["EST", "Esther", "Esther", "AT", ["esther", "est"]],
  ["JOB", "Job", "Job", "AT", ["job"]],
  ["PSA", "Psaumes", "Psaume", "AT", ["psaumes", "psaume", "ps", "psa"]],
  ["PRO", "Proverbes", "Proverbes", "AT", ["proverbes", "proverbe", "prov", "pr"]],
  ["ECC", "Ecclésiaste", "Ecclésiaste", "AT", ["ecclesiaste", "qohelet", "ecc"]],
  ["SNG", "Cantique des cantiques", "Cantique", "AT", ["cantique des cantiques", "cantique", "cantiques", "cant", "ct"]],
  ["ISA", "Ésaïe", "Ésaïe", "AT", ["esaie", "isaie", "es", "isa"]],
  ["JER", "Jérémie", "Jérémie", "AT", ["jeremie", "jer"]],
  ["LAM", "Lamentations", "Lamentations", "AT", ["lamentations", "lam"]],
  ["EZK", "Ézéchiel", "Ézéchiel", "AT", ["ezechiel", "eze", "ezk"]],
  ["DAN", "Daniel", "Daniel", "AT", ["daniel", "dan"]],
  ["HOS", "Osée", "Osée", "AT", ["osee", "hos"]],
  ["JOL", "Joël", "Joël", "AT", ["joel", "joe", "jol"]],
  ["AMO", "Amos", "Amos", "AT", ["amos", "amo"]],
  ["OBA", "Abdias", "Abdias", "AT", ["abdias", "oba"]],
  ["JON", "Jonas", "Jonas", "AT", ["jonas", "jon"]],
  ["MIC", "Michée", "Michée", "AT", ["michee", "mic"]],
  ["NAM", "Nahum", "Nahum", "AT", ["nahum", "nah", "nam"]],
  ["HAB", "Habacuc", "Habacuc", "AT", ["habacuc", "hab"]],
  ["ZEP", "Sophonie", "Sophonie", "AT", ["sophonie", "sop", "zep"]],
  ["HAG", "Aggée", "Aggée", "AT", ["aggee", "agg", "hag"]],
  ["ZEC", "Zacharie", "Zacharie", "AT", ["zacharie", "zac", "zec"]],
  ["MAL", "Malachie", "Malachie", "AT", ["malachie", "mal"]],
  ["MAT", "Matthieu", "Matthieu", "NT", ["matthieu", "matt", "mt", "mat"]],
  ["MRK", "Marc", "Marc", "NT", ["marc", "mc", "mar", "mrk"]],
  ["LUK", "Luc", "Luc", "NT", ["luc", "lc", "luk"]],
  ["JHN", "Jean", "Jean", "NT", ["jean", "jn", "joh", "jhn"]],
  ["ACT", "Actes", "Actes", "NT", ["actes", "act", "ac"]],
  ["ROM", "Romains", "Romains", "NT", ["romains", "rom", "rm"]],
  ["1CO", "1 Corinthiens", "1 Corinthiens", "NT", ["1 corinthiens", "1corinthiens", "1 cor", "1co"]],
  ["2CO", "2 Corinthiens", "2 Corinthiens", "NT", ["2 corinthiens", "2corinthiens", "2 cor", "2co"]],
  ["GAL", "Galates", "Galates", "NT", ["galates", "gal"]],
  ["EPH", "Éphésiens", "Éphésiens", "NT", ["ephesiens", "eph"]],
  ["PHP", "Philippiens", "Philippiens", "NT", ["philippiens", "phil", "phi", "php"]],
  ["COL", "Colossiens", "Colossiens", "NT", ["colossiens", "col"]],
  ["1TH", "1 Thessaloniciens", "1 Thessaloniciens", "NT", ["1 thessaloniciens", "1thessaloniciens", "1 th", "1th"]],
  ["2TH", "2 Thessaloniciens", "2 Thessaloniciens", "NT", ["2 thessaloniciens", "2thessaloniciens", "2 th", "2th"]],
  ["1TI", "1 Timothée", "1 Timothée", "NT", ["1 timothee", "1timothee", "1 tim", "1ti"]],
  ["2TI", "2 Timothée", "2 Timothée", "NT", ["2 timothee", "2timothee", "2 tim", "2ti"]],
  ["TIT", "Tite", "Tite", "NT", ["tite", "tit"]],
  ["PHM", "Philémon", "Philémon", "NT", ["philemon", "phm"]],
  ["HEB", "Hébreux", "Hébreux", "NT", ["hebreux", "heb"]],
  ["JAS", "Jacques", "Jacques", "NT", ["jacques", "jac", "jq", "jam", "jas"]],
  ["1PE", "1 Pierre", "1 Pierre", "NT", ["1 pierre", "1pierre", "1 pi", "1pe"]],
  ["2PE", "2 Pierre", "2 Pierre", "NT", ["2 pierre", "2pierre", "2 pi", "2pe"]],
  ["1JN", "1 Jean", "1 Jean", "NT", ["1 jean", "1jean", "1 jn", "1jo"]],
  ["2JN", "2 Jean", "2 Jean", "NT", ["2 jean", "2jean", "2 jn", "2jo"]],
  ["3JN", "3 Jean", "3 Jean", "NT", ["3 jean", "3jean", "3 jn", "3jo"]],
  ["JUD", "Jude", "Jude", "NT", ["jude", "jud"]],
  ["REV", "Apocalypse", "Apocalypse", "NT", ["apocalypse", "apo", "ap", "rev"]],
].map(([code, name, singular, testament, aliases]) => ({
  code,
  name,
  singular,
  testament,
  aliases,
}));

const sources = [
  { id: "LSG", translationId: "fra_lsg", file: "lsg.json" },
  { id: "DARBY", translationId: "fra_jnd", file: "darby.json" },
];

function appendText(current, next) {
  if (!next) return current;
  if (!current) return next;
  if (
    /\s$/u.test(current) ||
    /^\s/u.test(next) ||
    /^[,.;:!?%)\]}»]/u.test(next) ||
    /[(\[{«/'’‑-]$/u.test(current)
  ) {
    return `${current}${next}`;
  }
  return `${current} ${next}`;
}

function flattenContent(content = []) {
  let text = "";
  for (const item of content) {
    if (typeof item === "string") {
      text = appendText(text, item);
      continue;
    }
    if (item.lineBreak || item.noteId) {
      text = `${text} `;
      continue;
    }
    if (item.text) {
      text = appendText(text, item.text);
      continue;
    }
    text = appendText(text, flattenContent(item.content));
  }
  return text
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/\s+([,.;!?%)\]}»])/gu, "$1")
    .replace(/([(\[{«])\s+/gu, "$1")
    .trim();
}

async function downloadSource(source) {
  const apiUrl = `https://bible.helloao.org/api/${source.translationId}/complete.json`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${apiUrl}`);
  }
  const remote = await response.json();
  const parsedBooks = Object.fromEntries(
    remote.books.map((book) => [
      book.id,
      book.chapters.map((chapterEntry) => {
        const chapter = chapterEntry.chapter ?? chapterEntry;
        const verses = [];
        for (const item of chapter.content) {
          if (item.type !== "verse" || !item.number) continue;
          verses[item.number - 1] = flattenContent(item.content).trim();
        }
        return verses;
      }),
    ]),
  );
  const bible = {
    metadata: {
      id: source.id,
      translationId: remote.translation.id,
      name: remote.translation.name,
      abbreviation: remote.translation.shortName,
      language: "fr",
      source: "HelloAO / eBible.org",
      sourceUrl: remote.translation.website,
      licenseUrl: remote.translation.licenseUrl,
      license: "Domaine public",
      offline: true,
      sha256: remote.translation.sha256,
      importedAt: new Date().toISOString(),
    },
    books: parsedBooks,
  };
  await writeFile(resolve(outputDirectory, source.file), JSON.stringify(bible), "utf8");
  return bible;
}

await mkdir(outputDirectory, { recursive: true });
const importedBibles = await Promise.all(sources.map(downloadSource));

const catalog = {
  updatedAt: new Date().toISOString(),
  translations: importedBibles.map(({ metadata }) => metadata),
  books: books.map((book) => ({
    ...book,
    chapters: Math.max(
      ...importedBibles.map((bible) => bible.books[book.code]?.length ?? 0),
    ),
  })),
};

if (catalog.books.some((book) => book.chapters === 0)) {
  throw new Error("Au moins un livre est absent des corpus importés.");
}

await writeFile(
  resolve(outputDirectory, "catalog.json"),
  JSON.stringify(catalog),
  "utf8",
);

console.log(
  `Bibles importées : ${sources.map((source) => source.id).join(", ")} (${catalog.books.length} livres).`,
);
