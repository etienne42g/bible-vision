import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "public", "strong");
const bookOutputDirectory = resolve(outputDirectory, "lsg");
const stepBibleRoot =
  "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master";
const taggedBibleRoot = `${stepBibleRoot}/Translators%20Amalgamated%20OT%2BNT`;

const sources = {
  taggedTexts: [
    {
      testament: "NT",
      url: `${taggedBibleRoot}/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt`,
    },
    {
      testament: "NT",
      url: `${taggedBibleRoot}/TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt`,
    },
    {
      testament: "AT",
      url: `${taggedBibleRoot}/TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
    },
    {
      testament: "AT",
      url: `${taggedBibleRoot}/TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
    },
    {
      testament: "AT",
      url: `${taggedBibleRoot}/TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
    },
    {
      testament: "AT",
      url: `${taggedBibleRoot}/TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt`,
    },
  ],
  greekLexicon:
    `${stepBibleRoot}/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt`,
  hebrewLexicon:
    `${stepBibleRoot}/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt`,
  stepBible: "https://github.com/STEPBible/STEPBible-Data",
};

function normalizeStrongId(value) {
  const match = value.match(/^([GH])0*(\d+)/u);
  return match ? `${match[1]}${Number(match[2])}` : "";
}

async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  }
  return response.text();
}

function parseLexicon(raw) {
  const candidates = {};
  for (const line of raw.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const fields = line.split("\t");
    if (!/^[GH]\d+[A-Za-z]?$/u.test(fields[0] ?? "") || fields.length < 7) {
      continue;
    }
    const id = normalizeStrongId(fields[0]);
    if (!id) continue;
    const morph = fields[5]?.trim() ?? "";
    const candidate = {
      score:
        (fields[0] === id ? 100 : 0) +
        (!/N:N--L/u.test(morph) ? 20 : 0) +
        (/[GH]:[VN]/u.test(morph) ? 5 : 0),
      value: [
        fields[3]?.trim() ?? "",
        fields[4]?.trim() ?? "",
        morph,
        fields[6]?.trim() ?? "",
      ],
    };
    if (!candidates[id] || candidate.score > candidates[id].score) {
      candidates[id] = candidate;
    }
  }
  return Object.fromEntries(
    Object.entries(candidates).map(([id, candidate]) => [id, candidate.value]),
  );
}

function addForm(books, code, chapter, verse, id, form) {
  books[code] ??= {};
  books[code][chapter] ??= {};
  books[code][chapter][verse] ??= [];
  let group = books[code][chapter][verse].find((item) => item[0] === id);
  if (!group) {
    group = [id, []];
    books[code][chapter][verse].push(group);
  }
  if (form && !group[1].includes(form)) group[1].push(form);
}

function parseTaggedText(raw, testament, books, traditionalBooks) {
  for (const line of raw.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const fields = line.split("\t");
    const reference = fields[0]?.match(
      /^([1-3A-Za-z]{3})\.(\d+)\.(\d+)#\d+=([^()\t]+)/u,
    );
    if (!reference) continue;
    const [, sourceCode, chapter, verse, textType] = reference;
    if (testament === "AT" && !/^[LQRX]/u.test(textType)) continue;

    const strongField = testament === "NT" ? fields[11] : fields[8];
    const ids = [
      ...new Set(
        Array.from(
          (strongField ?? "").matchAll(/[GH]\d+[A-Za-z]?/gu),
          (match) => normalizeStrongId(match[0]),
        ).filter(Boolean),
      ),
    ];
    if (!ids.length) continue;

    const code = sourceCode.toUpperCase();
    const form =
      testament === "NT"
        ? (fields[1]?.replace(/\s+\([^)]*\)\s*$/u, "").trim() ?? "")
        : (fields[1]?.replace(/[\\/]/gu, "").trim() ?? "");
    if (testament === "NT") {
      const editions = new Set((fields[5] ?? "").split("+"));
      const target = editions.has("NA28")
        ? books
        : editions.has("TR")
          ? traditionalBooks
          : null;
      if (!target) continue;
      ids.forEach((id) => addForm(target, code, chapter, verse, id, form));
    } else {
      ids.forEach((id) => addForm(books, code, chapter, verse, id, form));
    }
  }
}

await mkdir(bookOutputDirectory, { recursive: true });

const [taggedTexts, greekLexiconRaw, hebrewLexiconRaw] = await Promise.all([
  Promise.all(
    sources.taggedTexts.map(async (source) => ({
      testament: source.testament,
      raw: await downloadText(source.url),
    })),
  ),
  downloadText(sources.greekLexicon),
  downloadText(sources.hebrewLexicon),
]);

const books = {};
const traditionalBooks = {};
for (const taggedText of taggedTexts) {
  parseTaggedText(taggedText.raw, taggedText.testament, books, traditionalBooks);
}
for (const [code, chapters] of Object.entries(traditionalBooks)) {
  books[code] ??= {};
  for (const [chapter, verses] of Object.entries(chapters)) {
    books[code][chapter] ??= {};
    for (const [verse, groups] of Object.entries(verses)) {
      books[code][chapter][verse] ??= groups;
    }
  }
}

const bookCodes = Object.keys(books);
for (const code of bookCodes) {
  await writeFile(
    resolve(bookOutputDirectory, `${code}.json`),
    JSON.stringify({ code, chapters: books[code] }),
    "utf8",
  );
}

const lexicon = {
  ...parseLexicon(hebrewLexiconRaw),
  ...parseLexicon(greekLexiconRaw),
};
await writeFile(
  resolve(outputDirectory, "lexicon.json"),
  JSON.stringify(lexicon),
  "utf8",
);
await writeFile(
  resolve(outputDirectory, "catalog.json"),
  JSON.stringify({
    updatedAt: new Date().toISOString(),
    referenceSystem: "English/NRSV canonical references",
    books: bookCodes,
    sources,
    attribution:
      "Textes originaux balisés et lexiques : STEP Bible / Tyndale House, Cambridge — CC BY 4.0.",
    caveat:
      "Le Nouveau Testament suit le texte principal NA28, avec repli sur le texte traditionnel pour les versets absents ; vérifiez toujours le contexte textuel.",
  }),
  "utf8",
);

console.log(
  `Strong importé : ${bookCodes.length} livres et ${Object.keys(lexicon).length} entrées lexicales.`,
);
