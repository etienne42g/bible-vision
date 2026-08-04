import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "public", "strong");
const bookOutputDirectory = resolve(outputDirectory, "lsg");
const execFileAsync = promisify(execFile);
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
  frenchAlignment: {
    url: "https://concordance.bible/media/download/Sg1910-csv_v11n.zip",
    page: "https://concordance.bible/Sg1910/download/",
    attribution:
      "Numéros Strong affectés en 2026 par “Concordances et Traductions de la Bible” (concordance.bible).",
  },
};

const osisToStepCode = {
  Gen: "GEN",
  Exod: "EXO",
  Lev: "LEV",
  Num: "NUM",
  Deut: "DEU",
  Josh: "JOS",
  Judg: "JDG",
  Ruth: "RUT",
  "1Sam": "1SA",
  "2Sam": "2SA",
  "1Kgs": "1KI",
  "2Kgs": "2KI",
  "1Chr": "1CH",
  "2Chr": "2CH",
  Ezra: "EZR",
  Neh: "NEH",
  Esth: "EST",
  Job: "JOB",
  Ps: "PSA",
  Prov: "PRO",
  Eccl: "ECC",
  Song: "SNG",
  Isa: "ISA",
  Jer: "JER",
  Lam: "LAM",
  Ezek: "EZK",
  Dan: "DAN",
  Hos: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obad: "OBA",
  Jonah: "JON",
  Mic: "MIC",
  Nah: "NAM",
  Hab: "HAB",
  Zeph: "ZEP",
  Hag: "HAG",
  Zech: "ZEC",
  Mal: "MAL",
  Matt: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Rom: "ROM",
  "1Cor": "1CO",
  "2Cor": "2CO",
  Gal: "GAL",
  Eph: "EPH",
  Phil: "PHP",
  Col: "COL",
  "1Thess": "1TH",
  "2Thess": "2TH",
  "1Tim": "1TI",
  "2Tim": "2TI",
  Titus: "TIT",
  Phlm: "PHM",
  Heb: "HEB",
  Jas: "JAS",
  "1Pet": "1PE",
  "2Pet": "2PE",
  "1John": "1JN",
  "2John": "2JN",
  "3John": "3JN",
  Jude: "JUD",
  Rev: "REV",
};

function normalizeStrongId(value) {
  const match = value.match(/^([GH])0*(\d+)/u);
  return match ? `${match[1]}${Number(match[2])}` : "";
}

async function downloadBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  }
  return response.text();
}

async function extractFrenchAlignment(archive) {
  const temporaryDirectory = await mkdtemp(
    resolve(tmpdir(), "bible-vision-strong-"),
  );
  const archivePath = resolve(temporaryDirectory, "Sg1910-csv.zip");
  try {
    await writeFile(archivePath, archive);
    const { stdout: fileList } = await execFileAsync(
      "unzip",
      ["-Z1", archivePath],
      { encoding: "utf8" },
    );
    const csvName = fileList
      .split(/\r?\n/u)
      .find((name) => name.toLowerCase().endsWith(".csv"));
    if (!csvName) {
      throw new Error("Le fichier d’alignement Strong ne contient aucun CSV.");
    }
    const { stdout } = await execFileAsync(
      "unzip",
      ["-p", archivePath, csvName],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    return stdout;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
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

function addFrenchWord(books, code, chapter, verse, id, word) {
  books[code] ??= {};
  books[code][chapter] ??= {};
  books[code][chapter][verse] ??= [];
  let group = books[code][chapter][verse].find((item) => item[0] === id);
  if (!group) {
    group = [id, []];
    books[code][chapter][verse].push(group);
  }
  if (word) {
    group[2] ??= [];
    if (!group[2].includes(word)) group[2].push(word);
  }
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#(?:x[\da-f]+|\d+)|[a-z]+);/giu,
    (entity, encoded) => {
      if (encoded.startsWith("#x") || encoded.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(encoded.slice(2), 16));
      }
      if (encoded.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(encoded.slice(1), 10));
      }
      return named[encoded.toLowerCase()] ?? entity;
    },
  );
}

function normalizeFrenchWords(value) {
  return decodeHtmlEntities(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function findDisplayedVerse(lsgBooks, code, chapter, sourceVerse, word) {
  const displayedChapter = lsgBooks[code]?.[Number(chapter) - 1] ?? [];
  if (!displayedChapter.length) return sourceVerse;
  const normalizedWord = normalizeFrenchWords(word);
  const sourceExists = Boolean(displayedChapter[sourceVerse - 1]);
  if (!normalizedWord) {
    return sourceExists ? sourceVerse : displayedChapter.length;
  }

  const candidates = [];
  const start = Math.max(1, sourceVerse - 2);
  const end = Math.min(displayedChapter.length, sourceVerse + 2);
  for (let verse = start; verse <= end; verse += 1) {
    const normalizedVerse = ` ${normalizeFrenchWords(displayedChapter[verse - 1])} `;
    if (normalizedVerse.includes(` ${normalizedWord} `)) candidates.push(verse);
  }
  if (candidates.includes(sourceVerse)) return sourceVerse;
  if (candidates.length) {
    return candidates.sort(
      (left, right) =>
        Math.abs(left - sourceVerse) - Math.abs(right - sourceVerse),
    )[0];
  }
  return sourceExists ? sourceVerse : displayedChapter.length;
}

function parseFrenchAlignment(raw, books, lsgBooks) {
  for (const line of raw.replace(/^\uFEFF/u, "").split(/\r?\n/u).slice(1)) {
    const [osisBook, chapter, verse, html = ""] = line.split("\t");
    const code = osisToStepCode[osisBook];
    if (!code || !chapter || !verse) continue;

    const sourceVerse = Number(verse);
    const tokens = Array.from(
      html.matchAll(/<w strong="([^"]+)">([^<]*)<\/w>/gu),
      (match) => {
        const word = decodeHtmlEntities(match[2]).trim();
        return {
          ids: match[1].match(/[GH]\d{4}/gu) ?? [],
          word: normalizeFrenchWords(word) ? word : "",
        };
      },
    );
    const displayedVerses = tokens.map((token) =>
      token.word
        ? findDisplayedVerse(
            lsgBooks,
            code,
            chapter,
            sourceVerse,
            token.word,
          )
        : null,
    );
    for (let index = 0; index < displayedVerses.length; index += 1) {
      if (displayedVerses[index] !== null) continue;
      for (let distance = 1; distance < displayedVerses.length; distance += 1) {
        const previous = displayedVerses[index - distance];
        const next = displayedVerses[index + distance];
        if (previous !== null && previous !== undefined) {
          displayedVerses[index] = previous;
          break;
        }
        if (next !== null && next !== undefined) {
          displayedVerses[index] = next;
          break;
        }
      }
      displayedVerses[index] ??= sourceVerse;
    }

    tokens.forEach((token, index) => {
      for (const sourceId of token.ids) {
        const id = normalizeStrongId(sourceId);
        if (id) {
          addFrenchWord(
            books,
            code,
            chapter,
            String(displayedVerses[index]),
            id,
            token.word,
          );
        }
      }
    });
  }
}

function buildOriginalCandidates(book) {
  const verses = Object.entries(book)
    .flatMap(([chapter, chapterVerses]) =>
      Object.entries(chapterVerses).map(([verse, groups]) => ({
        chapter: Number(chapter),
        verse: Number(verse),
        groups,
      })),
    )
    .sort(
      (left, right) =>
        left.chapter - right.chapter || left.verse - right.verse,
    );
  const candidates = [];
  const indexesById = new Map();

  for (let start = 0; start < verses.length; start += 1) {
    const forms = new Map();
    const ids = new Set();
    const order = [];
    const references = [];
    for (let end = start; end < verses.length && end < start + 3; end += 1) {
      references.push({
        chapter: verses[end].chapter,
        verse: verses[end].verse,
      });
      for (const [id, originalForms] of verses[end].groups) {
        if (!ids.has(id)) order.push(id);
        ids.add(id);
        const collected = forms.get(id) ?? new Set();
        originalForms.forEach((form) => collected.add(form));
        forms.set(id, collected);
      }
      candidates.push({
        forms: new Map(
          [...forms].map(([id, collected]) => [id, new Set(collected)]),
        ),
        ids: new Set(ids),
        order: [...order],
        references: [...references],
      });
    }
  }

  candidates.forEach((candidate, index) => {
    candidate.ids.forEach((id) => {
      const indexes = indexesById.get(id) ?? [];
      indexes.push(index);
      indexesById.set(id, indexes);
    });
  });

  return { candidates, indexesById };
}

function attachOriginalForms(books, originalBooks) {
  let matchedGroups = 0;
  let totalGroups = 0;

  for (const [code, chapters] of Object.entries(books)) {
    const { candidates, indexesById } = buildOriginalCandidates(
      originalBooks[code] ?? {},
    );
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, groups] of Object.entries(verses)) {
        totalGroups += groups.length;
        const targetIds = new Set(groups.map(([id]) => id));
        const relevantCandidateIndexes = new Set();
        targetIds.forEach((id) => {
          (indexesById.get(id) ?? []).forEach((index) =>
            relevantCandidateIndexes.add(index),
          );
        });
        let bestCandidate = null;
        let bestScore = Number.NEGATIVE_INFINITY;
        let bestCoverage = 0;

        for (const candidateIndex of relevantCandidateIndexes) {
          const candidate = candidates[candidateIndex];
          let overlap = 0;
          targetIds.forEach((id) => {
            if (candidate.ids.has(id)) overlap += 1;
          });
          if (!overlap) continue;
          const coverage = overlap / targetIds.size;
          const precision = overlap / candidate.ids.size;
          const targetChapter = Number(chapter);
          const targetVerse = Number(verse);
          const distance = Math.min(
            ...candidate.references.map(
              (reference) =>
                Math.abs(reference.chapter - targetChapter) * 12 +
                Math.abs(reference.verse - targetVerse) * 0.1,
            ),
          );
          const score =
            coverage * 100 +
            precision * 30 +
            Math.log2(overlap + 1) * 3 +
            (candidate.references.some(
              (reference) =>
                reference.chapter === targetChapter &&
                reference.verse === targetVerse,
            )
              ? 4
              : 0) -
            distance * 0.35 -
            (candidate.references.length - 1);
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
            bestCoverage = coverage;
          }
        }

        if (!bestCandidate || bestCoverage < 0.25) continue;
        for (const group of groups) {
          const forms = bestCandidate.forms.get(group[0]);
          if (!forms?.size) continue;
          group[1] = [...forms];
          matchedGroups += 1;
        }
        const order = new Map(
          bestCandidate.order.map((id, index) => [id, index]),
        );
        groups.sort(
          ([left], [right]) =>
            (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(right) ?? Number.MAX_SAFE_INTEGER),
        );
      }
    }
  }

  return { matchedGroups, totalGroups };
}

function parseTaggedText(raw, testament, books, traditionalBooks) {
  for (const line of raw.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const fields = line.split("\t");
    const reference = fields[0]?.match(
      /^([1-3A-Za-z]{3})\.(\d+)\.(\d+)(?:\([^#\t]*\)|\[[^#\t]*\]|\{[^#\t]*\})*#\d+=([^()\t]+)/u,
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

const [
  taggedTexts,
  greekLexiconRaw,
  hebrewLexiconRaw,
  frenchAlignmentArchive,
  lsgBibleRaw,
] = await Promise.all([
    Promise.all(
      sources.taggedTexts.map(async (source) => ({
        testament: source.testament,
        raw: await downloadText(source.url),
      })),
    ),
    downloadText(sources.greekLexicon),
    downloadText(sources.hebrewLexicon),
    downloadBytes(sources.frenchAlignment.url),
    readFile(resolve(projectRoot, "public", "bibles", "lsg.json"), "utf8"),
  ]);

const originalBooks = {};
const traditionalBooks = {};
for (const taggedText of taggedTexts) {
  parseTaggedText(
    taggedText.raw,
    taggedText.testament,
    originalBooks,
    traditionalBooks,
  );
}
for (const [code, chapters] of Object.entries(traditionalBooks)) {
  originalBooks[code] ??= {};
  for (const [chapter, verses] of Object.entries(chapters)) {
    originalBooks[code][chapter] ??= {};
    for (const [verse, groups] of Object.entries(verses)) {
      originalBooks[code][chapter][verse] ??= groups;
    }
  }
}
const books = {};
parseFrenchAlignment(
  await extractFrenchAlignment(frenchAlignmentArchive),
  books,
  JSON.parse(lsgBibleRaw).books,
);
const alignmentStats = attachOriginalForms(books, originalBooks);

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
    referenceSystem: "Segond 1910 historical references",
    books: bookCodes,
    sources,
    attribution:
      "Textes originaux balisés et lexiques : STEP Bible / Tyndale House, Cambridge — CC BY 4.0. Numéros Strong affectés en 2026 par “Concordances et Traductions de la Bible” (concordance.bible).",
    caveat:
      "Les références suivent la versification historique Segond 1910. Le Nouveau Testament original suit le texte principal NA28, avec repli sur le texte traditionnel pour les versets absents. Les mots français suivent les affectations Strong Sg1910, dont la fiabilisation continue ; vérifiez toujours le contexte textuel.",
  }),
  "utf8",
);

console.log(
  `Strong importé : ${bookCodes.length} livres, ${alignmentStats.matchedGroups}/${alignmentStats.totalGroups} groupes avec forme originale et ${Object.keys(lexicon).length} entrées lexicales.`,
);
