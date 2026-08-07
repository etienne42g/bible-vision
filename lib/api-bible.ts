export type ApiBibleContentNode = {
  type?: string;
  name?: string;
  text?: string;
  attrs?: {
    number?: string;
    sid?: string;
    eid?: string;
    verseId?: string;
    verseOrgIds?: string[];
  };
  items?: ApiBibleContentNode[];
};

export type ApiBibleSearchVerse = {
  id: string;
  orgId?: string;
  bookId: string;
  chapterId: string;
  text: string;
  reference: string;
};

function verseNumberFromId(value?: string) {
  const match = value?.match(/\.(\d+)[a-z]?$/i);
  return match ? Number(match[1]) : null;
}

function cleanVerseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseApiBibleChapter(
  content: ApiBibleContentNode[] | string,
) {
  if (!Array.isArray(content)) return [] as string[];

  const verses = new Map<number, string[]>();
  let currentVerse: number | null = null;

  const visit = (nodes: ApiBibleContentNode[]) => {
    for (const node of nodes) {
      if (node.type === "tag" && node.name === "verse") {
        if (node.attrs?.eid) {
          currentVerse = null;
        } else {
          currentVerse =
            Number(node.attrs?.number) || verseNumberFromId(node.attrs?.sid);
        }
        continue;
      }

      if (node.type === "text" && node.text) {
        const explicitVerse =
          verseNumberFromId(node.attrs?.verseId) ??
          verseNumberFromId(node.attrs?.verseOrgIds?.[0]);
        const verse = explicitVerse ?? currentVerse;
        if (verse) {
          const parts = verses.get(verse) ?? [];
          parts.push(node.text);
          verses.set(verse, parts);
        }
      }

      if (node.items?.length) visit(node.items);
    }
  };

  visit(content);
  const lastVerse = Math.max(0, ...verses.keys());
  return Array.from({ length: lastVerse }, (_, index) =>
    cleanVerseText((verses.get(index + 1) ?? []).join("")),
  );
}

export function parseApiBibleSearchResults(verses: ApiBibleSearchVerse[]) {
  return verses.flatMap((verse) => {
    const chapterMatch = verse.chapterId.match(/\.(\d+)$/);
    const verseNumber = verseNumberFromId(verse.orgId || verse.id);
    if (!chapterMatch || !verseNumber) return [];
    return [
      {
        bookCode: verse.bookId,
        chapter: Number(chapterMatch[1]),
        verse: verseNumber,
        text: cleanVerseText(verse.text),
      },
    ];
  });
}
