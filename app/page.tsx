"use client";

import {
  Anchor,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  Feather,
  FileDown,
  FileJson,
  Heart,
  Highlighter,
  Library,
  Maximize2,
  Menu,
  MessageSquareText,
  Minus,
  Moon,
  Plus,
  Printer,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Text,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  type BibleBook,
  type BibleCatalog,
  type BibleData,
  type SearchResult,
  type TranslationId,
  formatReference,
  getChapterVerses,
  groupConsecutiveNumbers,
  loadBible,
  loadBibleCatalog,
  normalizeBibleText,
  parseReference,
  searchBible,
} from "../lib/bible";
import {
  clearLocalState,
  loadLocalState,
  saveLocalState,
} from "../lib/local-store";
import { withoutSentImport } from "../lib/ancre";
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type View =
  | "read"
  | "search"
  | "study"
  | "ancre"
  | "sermons"
  | "library"
  | "settings";
type Theme = "light" | "sepia" | "dark";
type LibraryFilter = "all" | "favorites" | "highlights" | "notes" | "ancre";
type SearchScope = "all" | "AT" | "NT" | "notes";
type ImportStatus = "local" | "pending";

type NoteRecord = {
  id: string;
  selectionKey: string;
  reference: string;
  bookCode: string;
  chapter: number;
  verses: number[];
  translation: TranslationId;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type AncreImport = {
  version: 1;
  externalId: string;
  fingerprint: string;
  source: "bible-vision";
  createdAt: string;
  status: ImportStatus;
  action: "inbox" | "inbox-and-review";
  passage: {
    bookId: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
    reference: string;
    translationId: "fra_lsg" | "fra_jnd";
    translationName: string;
    corpusSha256: string;
    language: "fr";
    text: string;
  };
  note?: string;
  theme?: string;
  difficulty: "easy" | "medium" | "hard";
  reminderTimes: string[];
};

type SermonSection = {
  id: string;
  title: string;
  minutes: number;
};

type SermonProject = {
  id: string;
  title: string;
  passage: string;
  audience: string;
  duration: number;
  status: "idée" | "recherche" | "brouillon" | "prêt" | "archivé";
  objective: string;
  sections: SermonSection[];
  updatedAt: string;
};

type HistoryEntry = {
  bookCode: string;
  chapter: number;
  visitedAt: string;
};

type PersistedState = {
  version: 2;
  bookCode: string;
  chapter: number;
  translation: TranslationId;
  theme: Theme;
  highContrast: boolean;
  fontSize: number;
  showNumbers: boolean;
  highlights: Record<string, string>;
  notes: NoteRecord[];
  favorites: string[];
  imports: AncreImport[];
  sermons: SermonProject[];
  activeSermonId: string;
  history: HistoryEntry[];
  readingPositions: Record<string, number>;
  downloadedTranslations: TranslationId[];
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type StrongEntry = {
  id: string;
  original: string;
  transliteration: string;
  kind: string;
  definition: string;
  occurrences: string;
};

const highlightColors = [
  { key: "yellow", color: "#f7d878", label: "Promesse" },
  { key: "green", color: "#a9d5b5", label: "Encouragement" },
  { key: "blue", color: "#9ccbd8", label: "Vérité" },
  { key: "red", color: "#e8a29a", label: "Avertissement" },
  { key: "purple", color: "#c5add6", label: "Prière" },
  { key: "orange", color: "#efb77c", label: "À approfondir" },
];

const strongEntries: StrongEntry[] = [
  {
    id: "G25",
    original: "ἀγαπάω",
    transliteration: "agapaō",
    kind: "verbe grec",
    definition:
      "Aimer, accueillir avec affection et rechercher activement le bien d’une personne.",
    occurrences: "Jean 3:16 · Jean 13:34 · Romains 8:37",
  },
  {
    id: "G26",
    original: "ἀγάπη",
    transliteration: "agapē",
    kind: "nom grec",
    definition:
      "Amour qui se donne, bienveillance et attachement exprimés en actes.",
    occurrences: "1 Corinthiens 13 · 1 Jean 4:8",
  },
  {
    id: "H7462",
    original: "רָעָה",
    transliteration: "rāʿâ",
    kind: "verbe hébreu",
    definition:
      "Faire paître, conduire et prendre soin d’un troupeau ; par extension, accompagner.",
    occurrences: "Psaume 23:1 · Ézéchiel 34:15",
  },
  {
    id: "H2617",
    original: "חֶסֶד",
    transliteration: "ḥesed",
    kind: "nom hébreu",
    definition:
      "Bonté fidèle, grâce et loyauté durable au sein d’une alliance.",
    occurrences: "Psaume 23:6 · Psaume 136",
  },
];

const fallbackCatalog: BibleCatalog = {
  updatedAt: "",
  translations: [
    {
      id: "LSG",
      translationId: "fra_lsg",
      name: "Louis Segond 1910",
      abbreviation: "LSG",
      language: "fr",
      source: "eBible.org",
      sourceUrl: "https://ebible.org/bible/details.php?id=fraLSG",
      licenseUrl: "https://ebible.org/fraLSG/copyright.htm",
      license: "Domaine public",
      offline: true,
      sha256: "",
      importedAt: "",
    },
    {
      id: "DARBY",
      translationId: "fra_jnd",
      name: "Bible J.N. Darby",
      abbreviation: "DARBY",
      language: "fr",
      source: "eBible.org / BPC",
      sourceUrl: "https://ebible.org/bible/details.php?id=frajnd",
      licenseUrl: "https://ebible.org/bible/details.php?id=frajnd",
      license: "Domaine public",
      offline: true,
      sha256: "",
      importedAt: "",
    },
  ],
  books: [
    {
      code: "JHN",
      name: "Jean",
      singular: "Jean",
      testament: "NT",
      aliases: ["jean", "jn"],
      chapters: 21,
    },
  ],
};

const fallbackBible: BibleData = {
  metadata: fallbackCatalog.translations[0],
  books: {
    JHN: [
      [],
      [],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Et comme Moïse éleva le serpent dans le désert, il faut de même que le Fils de l’homme soit élevé,",
        "afin que quiconque croit en lui ait la vie éternelle.",
        "Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.",
        "Dieu, en effet, n’a pas envoyé son Fils dans le monde pour qu’il juge le monde, mais pour que le monde soit sauvé par lui.",
      ],
    ],
  },
};

const defaultSermon: SermonProject = {
  id: "sermon-welcome",
  title: "L’amour qui vient à notre rencontre",
  passage: "Jean 3:16–21",
  audience: "Assemblée",
  duration: 25,
  status: "brouillon",
  objective:
    "Inviter chacun à recevoir l’amour de Dieu et à marcher dans la lumière.",
  sections: [
    { id: "section-1", title: "Dieu prend l’initiative — Jean 3:16", minutes: 6 },
    { id: "section-2", title: "La lumière révèle le cœur — Jean 3:19–21", minutes: 8 },
    { id: "section-3", title: "Répondre par la foi — application", minutes: 7 },
  ],
  updatedAt: "2026-08-04T00:00:00.000Z",
};

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "read", label: "Lire", icon: BookOpen },
  { id: "search", label: "Rechercher", icon: Search },
  { id: "study", label: "Étudier", icon: Sparkles },
  { id: "ancre", label: "Ancre", icon: Anchor },
  { id: "sermons", label: "Prédications", icon: Feather },
  { id: "library", label: "Bibliothèque", icon: Library },
];

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function simpleHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeBase64Url(value: object) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(value: number) {
  if (!value) return "0 Mo";
  return `${(value / 1024 / 1024).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} Mo`;
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<View>("read");
  const [catalog, setCatalog] = useState<BibleCatalog>(fallbackCatalog);
  const [catalogReady, setCatalogReady] = useState(false);
  const [bibles, setBibles] = useState<Partial<Record<TranslationId, BibleData>>>({
    LSG: fallbackBible,
  });
  const [loadingBible, setLoadingBible] = useState(true);
  const [bookCode, setBookCode] = useState("JHN");
  const [chapter, setChapter] = useState(3);
  const [translation, setTranslation] = useState<TranslationId>("LSG");
  const [selected, setSelected] = useState<number[]>([]);
  const [lastSelected, setLastSelected] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [imports, setImports] = useState<AncreImport[]>([]);
  const [sermons, setSermons] = useState<SermonProject[]>([defaultSermon]);
  const [activeSermonId, setActiveSermonId] = useState(defaultSermon.id);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [readingPositions, setReadingPositions] = useState<Record<string, number>>({});
  const [downloadedTranslations, setDownloadedTranslations] = useState<
    TranslationId[]
  >([]);
  const [fontSize, setFontSize] = useState(20);
  const [theme, setTheme] = useState<Theme>("light");
  const [highContrast, setHighContrast] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [compare, setCompare] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [referenceInput, setReferenceInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [ancreOpen, setAncreOpen] = useState(false);
  const [ancreTheme, setAncreTheme] = useState("Amour de Dieu");
  const [ancreNote, setAncreNote] = useState("");
  const [ancreDifficulty, setAncreDifficulty] =
    useState<AncreImport["difficulty"]>("medium");
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [strongOpen, setStrongOpen] = useState(false);
  const [strongSelected, setStrongSelected] = useState<StrongEntry>(strongEntries[0]);
  const [strongQuery, setStrongQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [offlineDownloading, setOfflineDownloading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window === "undefined"
      ? "default"
      : "Notification" in window
        ? Notification.permission
        : "unsupported",
  );
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const book = useMemo(
    () => catalog.books.find((item) => item.code === bookCode) ?? catalog.books[0],
    [bookCode, catalog.books],
  );
  const currentBible = bibles[translation] ?? null;
  const verses = useMemo(
    () => getChapterVerses(currentBible, bookCode, chapter),
    [bookCode, chapter, currentBible],
  );
  const comparisonTranslation: TranslationId =
    translation === "LSG" ? "DARBY" : "LSG";
  const comparisonVerses = useMemo(
    () => getChapterVerses(bibles[comparisonTranslation] ?? null, bookCode, chapter),
    [bibles, bookCode, chapter, comparisonTranslation],
  );
  const selectedVerses = useMemo(
    () => verses.filter((verse) => selected.includes(verse.n)),
    [selected, verses],
  );
  const selectedReference = formatReference(book.name, chapter, selected);
  const selectedText = selectedVerses
    .map((verse) => `${verse.n} ${verse.text}`)
    .join(" ");
  const selectionKey = `${bookCode}:${chapter}:${selected
    .slice()
    .sort((a, b) => a - b)
    .join(",")}`;
  const favoriteKey = `${bookCode}:${chapter}`;
  const activeSermon =
    sermons.find((sermon) => sermon.id === activeSermonId) ?? sermons[0];
  const totalSermonMinutes =
    activeSermon?.sections.reduce((total, section) => total + section.minutes, 0) ??
    0;
  const modalActive = noteOpen || ancreOpen || strongOpen;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadBibleCatalog(), loadBible("LSG")])
      .then(([nextCatalog, bible]) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        setBibles((previous) => ({ ...previous, LSG: bible }));
        setCatalogReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setToast(
            "Le corpus complet n’a pas pu être chargé. La lecture de secours reste disponible.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bibles[translation]?.books?.[bookCode]) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadingBible(true);
    });
    loadBible(translation)
      .then((bible) => {
        if (!cancelled) setBibles((previous) => ({ ...previous, [translation]: bible }));
      })
      .catch(() => {
        if (!cancelled) setToast(`La traduction ${translation} est indisponible.`);
      })
      .finally(() => {
        if (!cancelled) setLoadingBible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bibles, bookCode, translation]);

  useEffect(() => {
    if (!compare || bibles[comparisonTranslation]) return;
    let cancelled = false;
    loadBible(comparisonTranslation)
      .then((bible) => {
        if (!cancelled) {
          setBibles((previous) => ({ ...previous, [comparisonTranslation]: bible }));
        }
      })
      .catch(() => {
        if (!cancelled) setToast("La comparaison n’a pas pu être chargée.");
      });
    return () => {
      cancelled = true;
    };
  }, [bibles, compare, comparisonTranslation]);

  useEffect(() => {
    let cancelled = false;
    loadLocalState<PersistedState>().then((saved) => {
      if (cancelled) return;
      if (saved.bookCode) setBookCode(saved.bookCode === "JOH" ? "JHN" : saved.bookCode);
      if (saved.chapter) setChapter(saved.chapter);
      if (saved.translation) setTranslation(saved.translation);
      if (saved.theme) setTheme(saved.theme);
      if (typeof saved.highContrast === "boolean") setHighContrast(saved.highContrast);
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (typeof saved.showNumbers === "boolean") setShowNumbers(saved.showNumbers);
      if (saved.highlights) setHighlights(saved.highlights);
      if (Array.isArray(saved.notes)) setNotes(saved.notes);
      if (saved.favorites) setFavorites(saved.favorites);
      if (saved.imports) setImports(saved.imports);
      if (saved.sermons?.length) setSermons(saved.sermons);
      if (saved.activeSermonId) setActiveSermonId(saved.activeSermonId);
      if (saved.history) setHistory(saved.history);
      if (saved.readingPositions) setReadingPositions(saved.readingPositions);
      if (saved.downloadedTranslations) {
        setDownloadedTranslations(saved.downloadedTranslations);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void saveLocalState<PersistedState>({
        version: 2,
        bookCode,
        chapter,
        translation,
        theme,
        highContrast,
        fontSize,
        showNumbers,
        highlights,
        notes,
        favorites,
        imports,
        sermons,
        activeSermonId,
        history,
        readingPositions,
        downloadedTranslations,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    activeSermonId,
    bookCode,
    chapter,
    downloadedTranslations,
    favorites,
    fontSize,
    highContrast,
    highlights,
    history,
    hydrated,
    imports,
    notes,
    readingPositions,
    sermons,
    showNumbers,
    theme,
    translation,
  ]);

  const refreshStorageEstimate = useCallback(() => {
    if (!navigator.storage?.estimate) return;
    void navigator.storage.estimate().then((estimate) => {
      setStorageUsage(estimate.usage ?? 0);
      setStorageQuota(estimate.quota ?? 0);
    });
  }, []);

  useEffect(() => {
    const setConnected = () => {
      setOnline(true);
      setImports((previous) =>
        previous.map((item) =>
          item.status === "pending" ? { ...item, status: "local" } : item,
        ),
      );
    };
    const setDisconnected = () => setOnline(false);
    window.addEventListener("online", setConnected);
    window.addEventListener("offline", setDisconnected);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    refreshStorageEstimate();
    return () => {
      window.removeEventListener("online", setConnected);
      window.removeEventListener("offline", setDisconnected);
    };
  }, [refreshStorageEstimate]);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(media.matches);
    queueMicrotask(update);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handleKeys = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        quickSearchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setNoteOpen(false);
        setAncreOpen(false);
        setStrongOpen(false);
        setHighlightOpen(false);
        setMobileMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  useEffect(() => {
    if (!modalActive) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusableSelector),
    );
    (dialog.querySelector<HTMLElement>("[autofocus]") ?? focusables[0] ?? dialog).focus();
    document.body.style.overflow = "hidden";

    const trapFocus = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab" || !focusables.length) return;
      const first = focusables[0];
      const last = focusables.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [modalActive]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!hydrated || activeView !== "read") return;
    let timer = 0;
    const key = `${bookCode}:${chapter}`;
    const savePosition = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setReadingPositions((previous) => ({
          ...previous,
          [key]: Math.round(window.scrollY),
        }));
      }, 180);
    };
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", savePosition);
    };
  }, [activeView, bookCode, chapter, hydrated]);

  const navigateTo = useCallback(
    (nextBookCode: string, nextChapter: number, verseSelection: number[] = []) => {
      const nextBook = catalog.books.find((item) => item.code === nextBookCode);
      if (!nextBook) return;
      const safeChapter = Math.min(Math.max(1, nextChapter), nextBook.chapters);
      setBookCode(nextBookCode);
      setChapter(safeChapter);
      setSelected(verseSelection);
      setLastSelected(verseSelection.at(-1) ?? null);
      setActiveView("read");
      setCompare(false);
      setHistory((previous) => {
        const entry: HistoryEntry = {
          bookCode: nextBookCode,
          chapter: safeChapter,
          visitedAt: new Date().toISOString(),
        };
        return [
          entry,
          ...previous.filter(
            (item) =>
              !(item.bookCode === nextBookCode && item.chapter === safeChapter),
          ),
        ].slice(0, 20);
      });
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: readingPositions[`${nextBookCode}:${safeChapter}`] ?? 0,
          behavior: "smooth",
        });
      });
    },
    [catalog.books, readingPositions],
  );

  function goToReference(value = referenceInput) {
    const parsed = parseReference(value, catalog);
    if (!parsed) {
      setSearchTerm(value);
      setActiveView("search");
      setToast(
        "Référence non reconnue : essayez « Jean 3:16 » ou recherchez ces mots.",
      );
      return;
    }
    const selection =
      parsed.startVerse !== undefined
        ? Array.from(
            {
              length:
                (parsed.endVerse ?? parsed.startVerse) - parsed.startVerse + 1,
            },
            (_, index) => parsed.startVerse! + index,
          )
        : [];
    navigateTo(parsed.book.code, parsed.chapter, selection);
    setReferenceInput("");
    setToast(`${formatReference(parsed.book.name, parsed.chapter, selection)} ouvert`);
  }

  function goAdjacent(direction: -1 | 1) {
    const bookIndex = catalog.books.findIndex((item) => item.code === bookCode);
    if (direction === -1 && chapter > 1) {
      navigateTo(bookCode, chapter - 1);
      return;
    }
    if (direction === 1 && chapter < book.chapters) {
      navigateTo(bookCode, chapter + 1);
      return;
    }
    const nextBook = catalog.books[bookIndex + direction];
    if (!nextBook) return;
    navigateTo(
      nextBook.code,
      direction === 1 ? 1 : nextBook.chapters,
    );
  }

  function toggleVerse(verse: number, extend = false) {
    setSelected((previous) => {
      if (extend && lastSelected !== null) {
        const start = Math.min(lastSelected, verse);
        const end = Math.max(lastSelected, verse);
        return [...new Set([...previous, ...Array.from({ length: end - start + 1 }, (_, index) => start + index)])].sort(
          (a, b) => a - b,
        );
      }
      return previous.includes(verse)
        ? previous.filter((value) => value !== verse)
        : [...previous, verse].sort((a, b) => a - b);
    });
    setLastSelected(verse);
  }

  function handleVerseKey(event: KeyboardEvent<HTMLDivElement>, verse: number) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleVerse(verse, event.shiftKey);
  }

  function applyHighlight(color?: string) {
    setHighlights((previous) => {
      const next = { ...previous };
      selected.forEach((verse) => {
        const key = `${bookCode}:${chapter}:${verse}`;
        if (color) next[key] = color;
        else delete next[key];
      });
      return next;
    });
    setHighlightOpen(false);
    setToast(
      color
        ? `${selected.length} verset${selected.length > 1 ? "s" : ""} surligné${selected.length > 1 ? "s" : ""}`
        : "Surlignage supprimé",
    );
  }

  function openNoteEditor() {
    const existing = notes.find((note) => note.selectionKey === selectionKey);
    setNoteTitle(existing?.title ?? "");
    setNoteDraft(existing?.content ?? "");
    setNoteTags(existing?.tags.join(", ") ?? "");
    setNoteOpen(true);
  }

  function saveNote() {
    if (!noteDraft.trim()) {
      setToast("Écrivez votre réflexion avant de l’enregistrer.");
      return;
    }
    const now = new Date().toISOString();
    setNotes((previous) => {
      const existing = previous.find((note) => note.selectionKey === selectionKey);
      const note: NoteRecord = {
        id: existing?.id ?? crypto.randomUUID(),
        selectionKey,
        reference: selectedReference,
        bookCode,
        chapter,
        verses: [...selected],
        translation,
        title: noteTitle.trim() || selectedReference,
        content: noteDraft.trim(),
        tags: noteTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return existing
        ? previous.map((item) => (item.id === existing.id ? note : item))
        : [note, ...previous];
    });
    setNoteOpen(false);
    setToast("Note enregistrée dans votre bibliothèque");
  }

  function deleteNote(id: string) {
    setNotes((previous) => previous.filter((note) => note.id !== id));
    setToast("Note supprimée");
  }

  function buildAncreLink(item: AncreImport) {
    const transferable =
      item.passage.text.length > 3500
        ? { ...item, passage: { ...item.passage, text: "" } }
        : item;
    return `https://memoryverses.etiennegrz.fr/import#v1=${encodeBase64Url(transferable)}`;
  }

  function markImportSent(item: AncreImport) {
    setImports((previous) => withoutSentImport(previous, item.externalId));
    setToast(`${item.passage.reference} envoyé à Ancre`);
  }

  function addToAncre(start = false) {
    if (!selected.length || !selectedText) return;
    const ranges = groupConsecutiveNumbers(selected);
    const created: AncreImport[] = ranges.map(({ start: verseStart, end: verseEnd }) => {
      const rangeVerses = selectedVerses.filter(
        (verse) => verse.n >= verseStart && verse.n <= verseEnd,
      );
      const text = rangeVerses.map((verse) => verse.text).join(" ");
      const reference = formatReference(
        book.name,
        chapter,
        Array.from(
          { length: verseEnd - verseStart + 1 },
          (_, index) => verseStart + index,
        ),
      );
      const fingerprint = simpleHash(
        `${translation}|${bookCode}|${chapter}|${verseStart}-${verseEnd}|${normalizeBibleText(text)}`,
      );
      return {
        version: 1,
        externalId: `bible-vision-${fingerprint}`,
        fingerprint,
        source: "bible-vision",
        createdAt: new Date().toISOString(),
        status: online ? "local" : "pending",
        action: start ? "inbox-and-review" : "inbox",
        passage: {
          bookId: bookCode,
          chapter,
          verseStart,
          verseEnd,
          reference,
          translationId:
            currentBible?.metadata.translationId ??
            (translation === "LSG" ? "fra_lsg" : "fra_jnd"),
          translationName: currentBible?.metadata.name ?? translation,
          corpusSha256: currentBible?.metadata.sha256 ?? "",
          language: "fr",
          text,
        },
        note: ancreNote.trim() || undefined,
        theme: ancreTheme.trim() || undefined,
        difficulty: ancreDifficulty,
        reminderTimes: [],
      };
    });

    const newItems = created.filter(
      (item) => !imports.some((existing) => existing.fingerprint === item.fingerprint),
    );
    if (!newItems.length) {
      setToast("Ce passage est déjà prêt pour Ancre — aucun doublon créé");
      setAncreOpen(false);
      return;
    }
    setAncreOpen(false);
    setAncreNote("");
    if (start) {
      const [sentItem, ...queuedItems] = newItems;
      window.open(buildAncreLink(sentItem), "_blank", "noopener,noreferrer");
      setImports((previous) => [...queuedItems, ...previous]);
      setToast(
        queuedItems.length
          ? `${sentItem.passage.reference} envoyé à Ancre · ${queuedItems.length} autre passage conservé`
          : `${sentItem.passage.reference} envoyé à Ancre`,
      );
      return;
    }
    setImports((previous) => [...newItems, ...previous]);
    setToast(
      online
        ? `${newItems.length} passage${newItems.length > 1 ? "s" : ""} préparé${newItems.length > 1 ? "s" : ""} pour Ancre`
        : "Passage conservé hors connexion pour Ancre",
    );
  }

  function copySelection() {
    void navigator.clipboard
      ?.writeText(
        `${selectedText}\n— ${selectedReference} (${currentBible?.metadata.name ?? translation})`,
      )
      .then(() => setToast("Passage copié"));
  }

  function shareSelection() {
    if (navigator.share) {
      void navigator
        .share({ title: selectedReference, text: selectedText })
        .catch(() => undefined);
    } else {
      copySelection();
    }
  }

  function updateSermon(patch: Partial<SermonProject>) {
    if (!activeSermon) return;
    setSermons((previous) =>
      previous.map((sermon) =>
        sermon.id === activeSermon.id
          ? { ...sermon, ...patch, updatedAt: new Date().toISOString() }
          : sermon,
      ),
    );
  }

  function addSelectionToSermon() {
    if (!activeSermon || !selected.length) return;
    const nextSection: SermonSection = {
      id: crypto.randomUUID(),
      title: `${selectedReference} — ${selectedText.slice(0, 84)}${selectedText.length > 84 ? "…" : ""}`,
      minutes: 4,
    };
    updateSermon({ sections: [...activeSermon.sections, nextSection] });
    setActiveView("sermons");
    setSelected([]);
    setToast("Passage ajouté à la prédication");
  }

  function moveSermonSection(index: number, direction: -1 | 1) {
    if (!activeSermon) return;
    const target = index + direction;
    if (target < 0 || target >= activeSermon.sections.length) return;
    const sections = [...activeSermon.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    updateSermon({ sections });
  }

  function exportSermon(format: "md" | "txt" | "print") {
    if (!activeSermon) return;
    const content = [
      `# ${activeSermon.title}`,
      "",
      `Passage principal : ${activeSermon.passage}`,
      `Public : ${activeSermon.audience}`,
      `Durée prévue : ${activeSermon.duration} min`,
      `Statut : ${activeSermon.status}`,
      "",
      "## Objectif",
      "",
      activeSermon.objective,
      "",
      "## Plan",
      "",
      ...activeSermon.sections.map(
        (section, index) =>
          `${index + 1}. ${section.title} (${section.minutes} min)`,
      ),
      "",
      `Durée estimée : ${totalSermonMinutes} min`,
    ].join("\n");
    if (format === "print") {
      window.print();
      return;
    }
    downloadFile(
      `predication-${activeSermon.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.${format}`,
      content,
      format === "md" ? "text/markdown" : "text/plain",
    );
    setToast(`Plan exporté en ${format === "md" ? "Markdown" : "texte"}`);
  }

  function exportLibraryMarkdown() {
    const content = [
      "# Bibliothèque Bible Vision",
      "",
      "## Notes",
      ...notes.flatMap((note) => [
        `### ${note.title}`,
        `${note.reference} · ${note.translation}`,
        "",
        note.content,
        note.tags.length ? `Étiquettes : ${note.tags.join(", ")}` : "",
        "",
      ]),
      "## Favoris",
      ...favorites.map((favorite) => {
        const [code, chapterRaw] = favorite.split(":");
        const item = catalog.books.find((bookItem) => bookItem.code === code);
        return `- ${item?.name ?? code} ${chapterRaw}`;
      }),
      "",
      "## Surlignages",
      ...Object.entries(highlights).map(([key, color]) => `- ${key} · ${color}`),
    ].join("\n");
    downloadFile("bibliotheque-bible-vision.md", content, "text/markdown");
    setToast("Bibliothèque exportée en Markdown");
  }

  function exportBackup() {
    const backup: PersistedState = {
      version: 2,
      bookCode,
      chapter,
      translation,
      theme,
      highContrast,
      fontSize,
      showNumbers,
      highlights,
      notes,
      favorites,
      imports,
      sermons,
      activeSermonId,
      history,
      readingPositions,
      downloadedTranslations,
    };
    downloadFile(
      `bible-vision-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
    setToast("Sauvegarde exportée");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void file
      .text()
      .then((raw) => JSON.parse(raw) as PersistedState)
      .then(async (backup) => {
        if (backup.version !== 2) throw new Error("Version incompatible");
        await saveLocalState(backup);
        window.location.reload();
      })
      .catch(() => setToast("Cette sauvegarde n’est pas valide."));
    event.target.value = "";
  }

  async function downloadOfflineBibles() {
    setOfflineDownloading(true);
    try {
      const urls = ["/bibles/catalog.json", "/bibles/lsg.json", "/bibles/darby.json"];
      if ("caches" in window) {
        const cache = await caches.open("bible-vision-bibles-v2");
        await Promise.all(
          urls.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(url);
            await cache.put(url, response.clone());
          }),
        );
      } else {
        await Promise.all(urls.map((url) => fetch(url)));
      }
      setDownloadedTranslations(["LSG", "DARBY"]);
      refreshStorageEstimate();
      setToast("LSG 1910 et Darby sont disponibles hors connexion");
    } catch {
      setToast("Le téléchargement hors connexion a échoué. Réessayez en ligne.");
    } finally {
      setOfflineDownloading(false);
    }
  }

  async function installApplication() {
    if (!installPrompt) {
      setToast("Utilisez « Ajouter à l’écran d’accueil » dans le menu du navigateur.");
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    setToast(
      result.outcome === "accepted"
        ? "Bible Vision est installée"
        : "Installation annulée",
    );
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setToast("Les notifications ne sont pas disponibles dans ce navigateur.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setToast(
      permission === "granted"
        ? "Notifications autorisées"
        : "Notifications non autorisées",
    );
  }

  async function resetApplication() {
    if (!window.confirm("Supprimer toutes les données locales de Bible Vision ?")) return;
    await clearLocalState();
    window.location.reload();
  }

  const parsedSearchReference = useMemo(
    () => (searchTerm.trim() ? parseReference(searchTerm, catalog) : null),
    [catalog, searchTerm],
  );
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || parsedSearchReference || searchScope === "notes") {
      return [] as SearchResult[];
    }
    return searchBible(currentBible ?? fallbackBible, catalog, searchTerm, 100).filter(
      (result) =>
        searchScope === "all" || result.book.testament === searchScope,
    );
  }, [
    catalog,
    currentBible,
    parsedSearchReference,
    searchScope,
    searchTerm,
  ]);
  const noteSearchResults = useMemo(() => {
    if (searchScope !== "notes" || !searchTerm.trim()) return [];
    const needle = normalizeBibleText(searchTerm);
    return notes.filter((note) =>
      normalizeBibleText(
        `${note.title} ${note.content} ${note.reference} ${note.tags.join(" ")}`,
      ).includes(needle),
    );
  }, [notes, searchScope, searchTerm]);
  const strongResults = useMemo(() => {
    const needle = normalizeBibleText(strongQuery);
    if (!needle) return strongEntries;
    return strongEntries.filter((entry) =>
      normalizeBibleText(
        `${entry.id} ${entry.original} ${entry.transliteration} ${entry.definition}`,
      ).includes(needle),
    );
  }, [strongQuery]);

  const recentHistory = history
    .map((entry) => ({
      ...entry,
      book: catalog.books.find((item) => item.code === entry.bookCode),
    }))
    .filter((entry): entry is HistoryEntry & { book: BibleBook } => Boolean(entry.book))
    .slice(0, 4);

  function renderVerseText(verse: { n: number; text: string }): ReactNode {
    const match =
      bookCode === "JHN" && chapter === 3 && verse.n === 16
        ? { word: "aimé", entry: strongEntries[0] }
        : bookCode === "PSA" && chapter === 23 && verse.n === 1
          ? { word: "berger", entry: strongEntries[2] }
          : null;
    if (!match) return verse.text;
    const originalIndex = verse.text.toLowerCase().indexOf(match.word);
    if (originalIndex < 0) return verse.text;
    return (
      <>
        {verse.text.slice(0, originalIndex)}
        <button
          className="strong-word"
          onClick={(event) => {
            event.stopPropagation();
            setStrongSelected(match.entry);
            setStrongOpen(true);
          }}
        >
          {verse.text.slice(originalIndex, originalIndex + match.word.length)}
        </button>
        {verse.text.slice(originalIndex + match.word.length)}
      </>
    );
  }

  return (
    <div
      className={cls(
        "app-shell",
        `theme-${theme}`,
        highContrast && "high-contrast",
      )}
    >
      <aside
        className={cls("sidebar", mobileMenu && "mobile-open")}
        aria-hidden={isMobile && !mobileMenu ? true : undefined}
        inert={modalActive || (isMobile && !mobileMenu)}
      >
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={22} strokeWidth={1.8} />
          </div>
          <div>
            <strong>Bible Vision</strong>
            <span>Lire · Étudier · Grandir</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          <span className="nav-caption">ESPACE BIBLIQUE</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cls("nav-item", activeView === id && "active")}
              onClick={() => {
                setActiveView(id);
                setMobileMenu(false);
              }}
              aria-current={activeView === id ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "ancre" && imports.length > 0 && (
                <b className="nav-badge">{imports.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={cls("nav-item", activeView === "settings" && "active")}
            onClick={() => {
              setActiveView("settings");
              setMobileMenu(false);
            }}
            aria-current={activeView === "settings" ? "page" : undefined}
          >
            <Settings size={19} strokeWidth={1.8} /> Réglages
          </button>
          <div className="profile">
            <div className="avatar">BV</div>
            <div>
              <strong>Mode local</strong>
              <span>Données privées sur cet appareil</span>
            </div>
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Fermer le menu"
        />
      )}

      <main className="main-area" inert={modalActive || (isMobile && mobileMenu)}>
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={mobileMenu}
          >
            <Menu size={22} />
          </button>
          <div className="quick-search">
            <Search size={18} />
            <input
              ref={quickSearchRef}
              value={referenceInput}
              onChange={(event) => setReferenceInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && goToReference()}
              placeholder="Référence ou recherche…"
              aria-label="Recherche rapide"
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className={cls("connection", !online && "offline")}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            {online ? "Données locales à jour" : "Hors connexion"}
          </div>
          <button
            className="icon-button"
            aria-label="Ouvrir les réglages de notifications"
            onClick={() => setActiveView("settings")}
          >
            <Bell size={18} />
          </button>
          <button
            className="avatar top-avatar"
            aria-label="Ouvrir les réglages"
            onClick={() => setActiveView("settings")}
          >
            BV
          </button>
        </header>

        {activeView === "read" && (
          <div className={cls("reader-layout", compare && "is-comparing")}>
            <section className="reader-panel">
              <div className="reader-toolbar">
                <div className="passage-selector">
                  <label className="book-select">
                    <select
                      value={bookCode}
                      onChange={(event) => navigateTo(event.target.value, 1)}
                      aria-label="Choisir un livre"
                      disabled={!catalogReady}
                    >
                      {catalog.books.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </label>
                  <label className="chapter-select">
                    <select
                      value={chapter}
                      onChange={(event) => navigateTo(bookCode, Number(event.target.value))}
                      aria-label="Choisir un chapitre"
                    >
                      {Array.from({ length: book.chapters }, (_, index) => (
                        <option key={index + 1} value={index + 1}>
                          Chapitre {index + 1}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </label>
                </div>
                <div className="reader-controls">
                  <button
                    className={cls(
                      "control-button",
                      favorites.includes(favoriteKey) && "active",
                    )}
                    onClick={() => {
                      setFavorites((list) =>
                        list.includes(favoriteKey)
                          ? list.filter((item) => item !== favoriteKey)
                          : [favoriteKey, ...list],
                      );
                      setToast(
                        favorites.includes(favoriteKey)
                          ? "Favori retiré"
                          : "Chapitre ajouté aux favoris",
                      );
                    }}
                    aria-label="Ajouter ou retirer des favoris"
                    aria-pressed={favorites.includes(favoriteKey)}
                  >
                    <Heart
                      size={17}
                      fill={favorites.includes(favoriteKey) ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className={cls("control-button", compare && "active")}
                    onClick={() => setCompare(!compare)}
                    aria-label="Comparer les traductions"
                    aria-pressed={compare}
                  >
                    <Columns3 size={17} />
                  </button>
                  <button
                    className="control-button"
                    onClick={() => setSelected(verses.map((verse) => verse.n))}
                    aria-label="Sélectionner tout le chapitre"
                  >
                    <Check size={17} />
                  </button>
                  <button
                    className="control-button"
                    onClick={() => void document.documentElement.requestFullscreen?.()}
                    aria-label="Passer en plein écran"
                  >
                    <Maximize2 size={17} />
                  </button>
                  <div className="font-control">
                    <button
                      onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                      aria-label="Réduire le texte"
                    >
                      <Minus size={14} />
                    </button>
                    <Text size={16} aria-hidden="true" />
                    <button
                      onClick={() => setFontSize(Math.min(30, fontSize + 2))}
                      aria-label="Agrandir le texte"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    className="control-button"
                    onClick={() =>
                      setTheme(
                        theme === "dark" ? "light" : theme === "light" ? "sepia" : "dark",
                      )
                    }
                    aria-label="Changer de thème"
                  >
                    {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
                  </button>
                </div>
              </div>

              <div className="chapter-heading">
                <div className="eyebrow">
                  {book.testament === "AT" ? "ANCIEN TESTAMENT" : "NOUVEAU TESTAMENT"} ·{" "}
                  {currentBible?.metadata.license ?? "DOMAINE PUBLIC"}
                </div>
                <div className="chapter-title-row">
                  <button
                    className="chapter-arrow"
                    aria-label="Chapitre précédent"
                    onClick={() => goAdjacent(-1)}
                  >
                    <ArrowLeft size={19} />
                  </button>
                  <div>
                    <h1>
                      {book.name} <span>{chapter}</span>
                    </h1>
                    <p>
                      {loadingBible
                        ? "Chargement du texte…"
                        : `${verses.length} versets · lecture hors connexion disponible`}
                    </p>
                  </div>
                  <button
                    className="chapter-arrow"
                    aria-label="Chapitre suivant"
                    onClick={() => goAdjacent(1)}
                  >
                    <ArrowRight size={19} />
                  </button>
                </div>
                <div className="translation-row">
                  <label className="translation-picker">
                    <select
                      value={translation}
                      onChange={(event) =>
                        setTranslation(event.target.value as TranslationId)
                      }
                      aria-label="Choisir une traduction"
                    >
                      {catalog.translations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.abbreviation} — {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </label>
                  <button
                    className={cls("numbers-toggle", showNumbers && "active")}
                    onClick={() => setShowNumbers(!showNumbers)}
                    aria-pressed={showNumbers}
                  >
                    N° versets
                  </button>
                  <a
                    className="license-link"
                    href={currentBible?.metadata.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source & licence <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <article
                className="scripture"
                style={{ "--reader-size": `${fontSize}px` } as CSSProperties}
                aria-label={`${book.name} ${chapter}, ${currentBible?.metadata.name ?? translation}`}
              >
                {verses.map((verse) => {
                  const isSelected = selected.includes(verse.n);
                  const color = highlights[`${bookCode}:${chapter}:${verse.n}`];
                  const hasNote = notes.some(
                    (note) =>
                      note.bookCode === bookCode &&
                      note.chapter === chapter &&
                      note.verses.includes(verse.n),
                  );
                  return (
                    <div
                      key={verse.n}
                      className={cls("verse", isSelected && "selected")}
                      style={
                        {
                          "--highlight": color
                            ? highlightColors.find((item) => item.key === color)?.color
                            : "transparent",
                        } as CSSProperties
                      }
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${book.name} ${chapter}, verset ${verse.n}. ${verse.text}`}
                      onClick={(event: MouseEvent<HTMLDivElement>) =>
                        toggleVerse(verse.n, event.shiftKey)
                      }
                      onKeyDown={(event) => handleVerseKey(event, verse.n)}
                    >
                      {showNumbers && (
                        <span className="verse-number" aria-hidden="true">
                          {verse.n}
                        </span>
                      )}
                      <p>{renderVerseText(verse)}</p>
                      {hasNote && (
                        <MessageSquareText
                          className="verse-note"
                          size={15}
                          aria-label="Ce verset contient une note"
                        />
                      )}
                      {isSelected && (
                        <span className="selection-check" aria-hidden="true">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </article>

              {compare && (
                <section className="comparison-panel" aria-label="Comparaison">
                  <div className="comparison-title">
                    <div>
                      <span>COMPARAISON</span>
                      <h2>
                        {bibles[comparisonTranslation]?.metadata.name ??
                          comparisonTranslation}
                      </h2>
                    </div>
                    <button
                      onClick={() => setCompare(false)}
                      aria-label="Fermer la comparaison"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {comparisonVerses.map((verse) => (
                    <div className="comparison-verse" key={verse.n}>
                      <b>{verse.n}</b>
                      <p>{verse.text}</p>
                    </div>
                  ))}
                  {!comparisonVerses.length && (
                    <p className="loading-copy">Chargement de la traduction…</p>
                  )}
                </section>
              )}
            </section>

            {!compare && (
              <aside className="context-panel">
                <section className="daily-card">
                  <span className="card-kicker">PASSAGE À ANCRER</span>
                  <div className="daily-icon">
                    <Sun size={20} />
                  </div>
                  <blockquote>
                    « Car Dieu a tant aimé le monde qu’il a donné son Fils unique… »
                  </blockquote>
                  <p>Jean 3:16 · Louis Segond 1910</p>
                  <button
                    onClick={() => {
                      navigateTo("JHN", 3, [16]);
                      setAncreOpen(true);
                    }}
                  >
                    <Anchor size={16} /> Mémoriser avec Ancre
                  </button>
                </section>

                <section className="side-section">
                  <div className="side-title">
                    <span>PARCOURS RÉCENTS</span>
                    <button onClick={() => setActiveView("library")}>Voir tout</button>
                  </div>
                  {recentHistory.length ? (
                    recentHistory.map((entry, index) => (
                      <button
                        className="recent-row"
                        key={`${entry.bookCode}:${entry.chapter}`}
                        onClick={() => navigateTo(entry.bookCode, entry.chapter)}
                      >
                        <span className={cls("recent-dot", `dot-${(index % 3) + 1}`)} />
                        <div>
                          <strong>
                            {entry.book.name} {entry.chapter}
                          </strong>
                          <small>
                            {new Date(entry.visitedAt).toLocaleDateString("fr-FR")}
                          </small>
                        </div>
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p className="side-empty">Votre historique apparaîtra ici.</p>
                  )}
                </section>

                <section className="side-section download-card">
                  <div className="side-title">
                    <span>HORS CONNEXION</span>
                    <b>{downloadedTranslations.length}/2 versions</b>
                  </div>
                  <div className="storage-line">
                    <span
                      style={{
                        width: `${storageQuota ? Math.min(100, (storageUsage / storageQuota) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="storage-copy">
                    <span>{formatBytes(storageUsage)} utilisés</span>
                    <span>{storageQuota ? formatBytes(storageQuota) : "quota inconnu"}</span>
                  </div>
                  <button
                    onClick={() => void downloadOfflineBibles()}
                    disabled={offlineDownloading}
                  >
                    <Download size={15} />{" "}
                    {offlineDownloading ? "Téléchargement…" : "Télécharger les deux versions"}
                  </button>
                </section>
              </aside>
            )}
          </div>
        )}

        {activeView === "search" && (
          <section className="content-page">
            <div className="page-heading">
              <span>EXPLORER LES ÉCRITURES</span>
              <h1>Rechercher</h1>
              <p>
                Retrouvez un mot, une expression, une référence ou une note personnelle.
              </p>
            </div>
            <div className="large-search">
              <Search size={21} />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ex. lumière, espérance, Jean 3:16…"
                aria-label="Rechercher dans la Bible"
              />
              <span className="search-version">{translation}</span>
            </div>
            <div className="filter-row">
              {(
                [
                  ["all", "Toute la Bible"],
                  ["AT", "Ancien Testament"],
                  ["NT", "Nouveau Testament"],
                  ["notes", "Mes notes"],
                ] as const
              ).map(([scope, label]) => (
                <button
                  key={scope}
                  className={searchScope === scope ? "active" : ""}
                  onClick={() => setSearchScope(scope)}
                  aria-pressed={searchScope === scope}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="results-list">
              {!searchTerm && (
                <div className="empty-state">
                  <div>
                    <Search size={30} />
                  </div>
                  <h2>Cherchez dans la Parole</h2>
                  <p>Essayez « lumière », « aimé », « berger » ou une référence.</p>
                </div>
              )}
              {parsedSearchReference && (
                <button
                  className="reference-result"
                  onClick={() => goToReference(searchTerm)}
                >
                  <BookOpen size={20} />
                  <span>
                    Ouvrir{" "}
                    <strong>
                      {formatReference(
                        parsedSearchReference.book.name,
                        parsedSearchReference.chapter,
                        parsedSearchReference.startVerse
                          ? Array.from(
                              {
                                length:
                                  (parsedSearchReference.endVerse ??
                                    parsedSearchReference.startVerse) -
                                  parsedSearchReference.startVerse +
                                  1,
                              },
                              (_, index) =>
                                parsedSearchReference.startVerse! + index,
                            )
                          : [],
                      )}
                    </strong>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {!parsedSearchReference &&
                searchScope !== "notes" &&
                searchTerm && (
                  <p className="result-count">
                    {searchResults.length} résultat
                    {searchResults.length > 1 ? "s" : ""}
                    {searchResults.length === 100 ? " parmi les premiers trouvés" : ""}
                  </p>
                )}
              {searchResults.map((result) => (
                <button
                  className="search-result"
                  key={`${result.book.code}-${result.chapter}-${result.verse}`}
                  onClick={() =>
                    navigateTo(result.book.code, result.chapter, [result.verse])
                  }
                >
                  <span>
                    {result.book.name} {result.chapter}:{result.verse}
                  </span>
                  <p>{result.text}</p>
                  <ArrowRight size={17} />
                </button>
              ))}
              {noteSearchResults.map((note) => (
                <button
                  className="search-result"
                  key={note.id}
                  onClick={() => navigateTo(note.bookCode, note.chapter, note.verses)}
                >
                  <span>{note.reference}</span>
                  <p>
                    <strong>{note.title}</strong> — {note.content}
                  </p>
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          </section>
        )}

        {activeView === "study" && (
          <section className="content-page">
            <div className="page-heading">
              <span>OUTILS D’ÉTUDE</span>
              <h1>Approfondir le texte</h1>
              <p>
                Concordance de base, mots originaux et traductions au même endroit.
              </p>
            </div>
            <div className="large-search strong-search">
              <Search size={21} />
              <input
                value={strongQuery}
                onChange={(event) => setStrongQuery(event.target.value)}
                placeholder="G25, agapaō, amour, H7462…"
                aria-label="Rechercher dans la concordance Strong"
              />
            </div>
            <div className="strong-results">
              {strongResults.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setStrongSelected(entry);
                    setStrongOpen(true);
                  }}
                >
                  <span>{entry.id}</span>
                  <strong>{entry.original}</strong>
                  <small>{entry.transliteration}</small>
                  <p>{entry.definition}</p>
                </button>
              ))}
            </div>
            <div className="study-grid study-secondary">
              <article className="feature-card">
                <div className="feature-icon">
                  <Columns3 size={22} />
                </div>
                <span>TRADUCTIONS</span>
                <h2>Comparer un passage</h2>
                <p>
                  Placez Louis Segond 1910 et Darby côte à côte pour observer chaque
                  nuance.
                </p>
                <button
                  onClick={() => {
                    setActiveView("read");
                    setCompare(true);
                  }}
                >
                  Comparer maintenant <ArrowRight size={16} />
                </button>
              </article>
              <article className="feature-card">
                <div className="feature-icon">
                  <BookMarked size={22} />
                </div>
                <span>SOURCES</span>
                <h2>Des textes vérifiables</h2>
                <p>
                  Les deux corpus embarqués sont attribués et déclarés dans le domaine
                  public par leurs distributeurs.
                </p>
                <button onClick={() => setActiveView("settings")}>
                  Voir les licences <ArrowRight size={16} />
                </button>
              </article>
            </div>
          </section>
        )}

        {activeView === "ancre" && (
          <section className="content-page">
            <div className="page-heading heading-row">
              <div>
                <span>MÉMORISER AVEC ANCRE</span>
                <h1>Faire habiter la Parole</h1>
                <p>
                  Préparez vos passages ici, puis confirmez leur import dans Ancre.
                </p>
              </div>
              <a
                className="primary-link"
                href="https://memoryverses.etiennegrz.fr"
                target="_blank"
                rel="noreferrer"
              >
                <Anchor size={17} /> Ouvrir Ancre
              </a>
            </div>
            <div className="ancre-stats">
              <article>
                <span>Passages préparés</span>
                <strong>{imports.length}</strong>
                <small>sur cet appareil</small>
              </article>
              <article>
                <span>En attente réseau</span>
                <strong>
                  {imports.filter((item) => item.status === "pending").length}
                </strong>
                <small>{online ? "connexion disponible" : "hors connexion"}</small>
              </article>
              <article>
                <span>Compte Ancre</span>
                <strong>
                  <i>À connecter</i>
                </strong>
                <small>ouverture sécurisée dans Ancre</small>
              </article>
            </div>
            <section className="review-card">
              <div className="review-copy">
                <span>RÉVISIONS</span>
                <h2>Retrouvez vos exercices dans Ancre</h2>
                <p>
                  Bible Vision ne remplace pas votre application de mémorisation.
                </p>
              </div>
              <button
                onClick={() =>
                  window.open(
                    "https://memoryverses.etiennegrz.fr",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <Sparkles size={18} /> Commencer une révision
              </button>
            </section>
            <div className="section-heading">
              <div>
                <span>BOÎTE DE DÉPART</span>
                <h2>Passages préparés</h2>
              </div>
              <small>
                {imports.length} passage{imports.length > 1 ? "s" : ""}
              </small>
            </div>
            <div className="imports-list">
              {imports.length === 0 && (
                <div className="empty-imports">
                  <Anchor size={25} />
                  <p>
                    Sélectionnez un passage dans le lecteur, puis choisissez « Envoyer
                    vers Ancre ».
                  </p>
                </div>
              )}
              {imports.map((item) => (
                <article key={item.externalId} className="import-row">
                  <div className="import-mark">
                    <Anchor size={17} />
                  </div>
                  <div>
                    <strong>{item.passage.reference}</strong>
                    <p>{item.passage.text}</p>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                      {item.passage.translationName}
                    </small>
                  </div>
                  <div className="import-actions">
                    <span
                      className={cls(
                        "status-pill",
                        item.status === "pending" && "pending",
                      )}
                    >
                      {item.status === "pending" ? "en attente" : "prêt"}
                    </span>
                    <a
                      href={buildAncreLink(item)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ouvrir ${item.passage.reference} dans Ancre`}
                      onClick={() => markImportSent(item)}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() =>
                        setImports((previous) =>
                          previous.filter(
                            (existing) => existing.externalId !== item.externalId,
                          ),
                        )
                      }
                      aria-label={`Supprimer ${item.passage.reference}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === "sermons" && activeSermon && (
          <section className="content-page sermon-page">
            <div className="page-heading heading-row">
              <div>
                <span>ATELIER DE PRÉDICATION</span>
                <h1>Préparer avec clarté</h1>
                <p>
                  Un plan local, réorganisable et exportable en plusieurs formats.
                </p>
              </div>
              <div className="export-actions">
                <button onClick={() => exportSermon("txt")}>
                  <FileDown size={16} /> Texte
                </button>
                <button onClick={() => exportSermon("md")}>
                  <Download size={16} /> Markdown
                </button>
                <button onClick={() => exportSermon("print")}>
                  <Printer size={16} /> PDF / imprimer
                </button>
              </div>
            </div>
            <div className="sermon-project-bar">
              <select
                value={activeSermonId}
                onChange={(event) => setActiveSermonId(event.target.value)}
                aria-label="Choisir une prédication"
              >
                {sermons.map((sermon) => (
                  <option key={sermon.id} value={sermon.id}>
                    {sermon.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const project: SermonProject = {
                    ...defaultSermon,
                    id: crypto.randomUUID(),
                    title: "Nouvelle prédication",
                    sections: [],
                    updatedAt: new Date().toISOString(),
                  };
                  setSermons((previous) => [project, ...previous]);
                  setActiveSermonId(project.id);
                }}
              >
                <Plus size={15} /> Nouveau projet
              </button>
            </div>
            <div className="sermon-workspace">
              <aside className="sermon-meta">
                <label>
                  TITRE
                  <input
                    value={activeSermon.title}
                    onChange={(event) => updateSermon({ title: event.target.value })}
                  />
                </label>
                <label>
                  PASSAGE PRINCIPAL
                  <input
                    value={activeSermon.passage}
                    onChange={(event) => updateSermon({ passage: event.target.value })}
                  />
                </label>
                <label>
                  PUBLIC
                  <input
                    value={activeSermon.audience}
                    onChange={(event) => updateSermon({ audience: event.target.value })}
                  />
                </label>
                <div className="meta-pair">
                  <label>
                    DURÉE
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={activeSermon.duration}
                      onChange={(event) =>
                        updateSermon({ duration: Number(event.target.value) || 5 })
                      }
                    />
                  </label>
                  <label>
                    STATUT
                    <select
                      value={activeSermon.status}
                      onChange={(event) =>
                        updateSermon({
                          status: event.target.value as SermonProject["status"],
                        })
                      }
                    >
                      <option>idée</option>
                      <option>recherche</option>
                      <option>brouillon</option>
                      <option>prêt</option>
                      <option>archivé</option>
                    </select>
                  </label>
                </div>
                <label>
                  OBJECTIF
                  <textarea
                    value={activeSermon.objective}
                    onChange={(event) => updateSermon({ objective: event.target.value })}
                  />
                </label>
              </aside>
              <div className="sermon-outline">
                <div className="outline-heading">
                  <div>
                    <span>PLAN</span>
                    <h2>Structure</h2>
                  </div>
                  <button
                    onClick={() =>
                      updateSermon({
                        sections: [
                          ...activeSermon.sections,
                          {
                            id: crypto.randomUUID(),
                            title: "Nouvelle partie",
                            minutes: 5,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                {activeSermon.sections.map((section, index) => (
                  <article className="outline-item final-outline" key={section.id}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <input
                      value={section.title}
                      aria-label={`Titre de la partie ${index + 1}`}
                      onChange={(event) =>
                        updateSermon({
                          sections: activeSermon.sections.map((item) =>
                            item.id === section.id
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                    <label className="minutes-field">
                      <span className="sr-only">Durée de la partie {index + 1}</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={section.minutes}
                        onChange={(event) =>
                          updateSermon({
                            sections: activeSermon.sections.map((item) =>
                              item.id === section.id
                                ? { ...item, minutes: Number(event.target.value) || 1 }
                                : item,
                            ),
                          })
                        }
                      />
                      min
                    </label>
                    <div className="outline-actions">
                      <button
                        onClick={() => moveSermonSection(index, -1)}
                        disabled={index === 0}
                        aria-label={`Monter la partie ${index + 1}`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveSermonSection(index, 1)}
                        disabled={index === activeSermon.sections.length - 1}
                        aria-label={`Descendre la partie ${index + 1}`}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() =>
                          updateSermon({
                            sections: activeSermon.sections.filter(
                              (item) => item.id !== section.id,
                            ),
                          })
                        }
                        aria-label={`Supprimer la partie ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
                {!activeSermon.sections.length && (
                  <p className="outline-empty">
                    Ajoutez une partie ou sélectionnez un passage dans le lecteur.
                  </p>
                )}
                <div className="duration-total">
                  <span>Durée estimée</span>
                  <strong>
                    {totalSermonMinutes} min{" "}
                    <small>/ {activeSermon.duration} min</small>
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "library" && (
          <section className="content-page">
            <div className="page-heading heading-row">
              <div>
                <span>VOTRE COLLECTION</span>
                <h1>Bibliothèque</h1>
                <p>Retrouvez, modifiez et exportez ce que vous avez gardé.</p>
              </div>
              <button className="primary-link" onClick={exportLibraryMarkdown}>
                <Download size={17} /> Exporter
              </button>
            </div>
            <div className="library-tabs">
              {(
                [
                  ["all", "Tout"],
                  ["favorites", "Favoris"],
                  ["highlights", "Surlignages"],
                  ["notes", "Notes"],
                  ["ancre", "Ancre"],
                ] as const
              ).map(([filter, label]) => (
                <button
                  key={filter}
                  className={libraryFilter === filter ? "active" : ""}
                  onClick={() => setLibraryFilter(filter)}
                  aria-pressed={libraryFilter === filter}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="library-grid">
              <article className="library-card">
                <div className="library-icon">
                  <Heart size={20} />
                </div>
                <span>FAVORIS</span>
                <strong>{favorites.length}</strong>
                <p>chapitre{favorites.length !== 1 ? "s" : ""} enregistré{favorites.length !== 1 ? "s" : ""}</p>
              </article>
              <article className="library-card">
                <div className="library-icon">
                  <Highlighter size={20} />
                </div>
                <span>SURLIGNAGES</span>
                <strong>{Object.keys(highlights).length}</strong>
                <p>verset{Object.keys(highlights).length !== 1 ? "s" : ""} classé{Object.keys(highlights).length !== 1 ? "s" : ""}</p>
              </article>
              <article className="library-card">
                <div className="library-icon">
                  <MessageSquareText size={20} />
                </div>
                <span>NOTES</span>
                <strong>{notes.length}</strong>
                <p>réflexion{notes.length !== 1 ? "s" : ""} personnelle{notes.length !== 1 ? "s" : ""}</p>
              </article>
              <article className="library-card">
                <div className="library-icon">
                  <Anchor size={20} />
                </div>
                <span>PRÊTS POUR ANCRE</span>
                <strong>{imports.length}</strong>
                <p>passage{imports.length !== 1 ? "s" : ""} préparé{imports.length !== 1 ? "s" : ""}</p>
              </article>
            </div>
            <div className="library-detail">
              {(libraryFilter === "all" || libraryFilter === "notes") &&
                notes.map((note) => (
                  <article key={note.id}>
                    <div className="library-detail-icon">
                      <MessageSquareText size={17} />
                    </div>
                    <button
                      className="library-detail-main"
                      onClick={() => navigateTo(note.bookCode, note.chapter, note.verses)}
                    >
                      <span>NOTE · {note.reference}</span>
                      <strong>{note.title}</strong>
                      <p>{note.content}</p>
                    </button>
                    <button
                      className="detail-delete"
                      onClick={() => deleteNote(note.id)}
                      aria-label={`Supprimer la note ${note.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              {(libraryFilter === "all" || libraryFilter === "favorites") &&
                favorites.map((favorite) => {
                  const [code, chapterRaw] = favorite.split(":");
                  const favoriteBook = catalog.books.find((item) => item.code === code);
                  return (
                    <article key={favorite}>
                      <div className="library-detail-icon">
                        <Heart size={17} />
                      </div>
                      <button
                        className="library-detail-main"
                        onClick={() => navigateTo(code, Number(chapterRaw))}
                      >
                        <span>FAVORI</span>
                        <strong>
                          {favoriteBook?.name ?? code} {chapterRaw}
                        </strong>
                        <p>Reprendre la lecture de ce chapitre.</p>
                      </button>
                      <button
                        className="detail-delete"
                        onClick={() =>
                          setFavorites((previous) =>
                            previous.filter((item) => item !== favorite),
                          )
                        }
                        aria-label={`Retirer ${favoriteBook?.name ?? code} ${chapterRaw} des favoris`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  );
                })}
              {(libraryFilter === "all" || libraryFilter === "highlights") &&
                Object.entries(highlights).map(([key, color]) => {
                  const [code, chapterRaw, verseRaw] = key.split(":");
                  const highlightedBook = catalog.books.find((item) => item.code === code);
                  const colorMeta = highlightColors.find((item) => item.key === color);
                  return (
                    <article key={key}>
                      <div
                        className="library-detail-icon"
                        style={{ background: colorMeta?.color }}
                      >
                        <Highlighter size={17} />
                      </div>
                      <button
                        className="library-detail-main"
                        onClick={() =>
                          navigateTo(code, Number(chapterRaw), [Number(verseRaw)])
                        }
                      >
                        <span>SURLIGNAGE · {colorMeta?.label ?? color}</span>
                        <strong>
                          {highlightedBook?.name ?? code} {chapterRaw}:{verseRaw}
                        </strong>
                        <p>Ouvrir le passage surligné.</p>
                      </button>
                      <button
                        className="detail-delete"
                        onClick={() =>
                          setHighlights((previous) => {
                            const next = { ...previous };
                            delete next[key];
                            return next;
                          })
                        }
                        aria-label={`Supprimer le surlignage ${key}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  );
                })}
              {(libraryFilter === "all" || libraryFilter === "ancre") &&
                imports.map((item) => (
                  <article key={item.externalId}>
                    <div className="library-detail-icon">
                      <Anchor size={17} />
                    </div>
                    <a
                      className="library-detail-main"
                      href={buildAncreLink(item)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => markImportSent(item)}
                    >
                      <span>ANCRE · {item.status === "pending" ? "EN ATTENTE" : "PRÊT"}</span>
                      <strong>{item.passage.reference}</strong>
                      <p>{item.passage.text}</p>
                    </a>
                    <button
                      className="detail-delete"
                      onClick={() =>
                        setImports((previous) =>
                          previous.filter(
                            (existing) => existing.externalId !== item.externalId,
                          ),
                        )
                      }
                      aria-label={`Supprimer ${item.passage.reference}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              {libraryFilter === "all" &&
                !notes.length &&
                !favorites.length &&
                !Object.keys(highlights).length &&
                !imports.length && (
                  <div className="empty-state">
                    <div>
                      <Library size={30} />
                    </div>
                    <h2>Votre bibliothèque est prête</h2>
                    <p>Surlignez, annotez ou ajoutez un chapitre aux favoris.</p>
                  </div>
                )}
            </div>
          </section>
        )}

        {activeView === "settings" && (
          <section className="content-page settings-page">
            <div className="page-heading">
              <span>PRÉFÉRENCES & DONNÉES</span>
              <h1>Réglages</h1>
              <p>
                Adaptez la lecture, installez la PWA et gardez la maîtrise de vos
                données.
              </p>
            </div>
            <div className="settings-list">
              <article>
                <div className="settings-icon">
                  <Sun size={19} />
                </div>
                <div>
                  <strong>Apparence</strong>
                  <p>Clair, sépia ou sombre.</p>
                </div>
                <div className="theme-switch">
                  {(["light", "sepia", "dark"] as Theme[]).map((item) => (
                    <button
                      key={item}
                      className={theme === item ? "active" : ""}
                      onClick={() => setTheme(item)}
                    >
                      {item === "light" ? "Clair" : item === "sepia" ? "Sépia" : "Sombre"}
                    </button>
                  ))}
                </div>
              </article>
              <article>
                <div className="settings-icon">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <strong>Contraste renforcé</strong>
                  <p>Augmente la lisibilité des bordures et des textes secondaires.</p>
                </div>
                <button
                  className={cls("settings-toggle", highContrast && "active")}
                  onClick={() => setHighContrast(!highContrast)}
                  aria-pressed={highContrast}
                >
                  {highContrast ? "Activé" : "Activer"}
                </button>
              </article>
              <article>
                <div className="settings-icon">
                  <Text size={19} />
                </div>
                <div>
                  <strong>Texte biblique</strong>
                  <p>Taille actuelle : {fontSize}px.</p>
                </div>
                <div className="font-control large">
                  <button
                    onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                    aria-label="Réduire la taille"
                  >
                    <Minus size={15} />
                  </button>
                  <span>Aa</span>
                  <button
                    onClick={() => setFontSize(Math.min(30, fontSize + 2))}
                    aria-label="Augmenter la taille"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </article>
              <article>
                <div className="settings-icon">
                  <Anchor size={19} />
                </div>
                <div>
                  <strong>Compte Ancre</strong>
                  <p>
                    L’authentification et la synchronisation se finalisent dans Ancre.
                  </p>
                </div>
                <a
                  href="https://memoryverses.etiennegrz.fr"
                  target="_blank"
                  rel="noreferrer"
                >
                  Connecter <ExternalLink size={13} />
                </a>
              </article>
              <article>
                <div className="settings-icon">
                  {online ? <Wifi size={19} /> : <WifiOff size={19} />}
                </div>
                <div>
                  <strong>Mode hors connexion</strong>
                  <p>
                    {downloadedTranslations.length === 2
                      ? "LSG 1910 et Darby sont téléchargées."
                      : "Téléchargez les deux corpus bibliques sur cet appareil."}
                  </p>
                </div>
                <button
                  className="settings-action"
                  onClick={() => void downloadOfflineBibles()}
                  disabled={offlineDownloading}
                >
                  {offlineDownloading ? "Téléchargement…" : "Télécharger"}
                </button>
              </article>
              <article>
                <div className="settings-icon">
                  <Download size={19} />
                </div>
                <div>
                  <strong>Installer Bible Vision</strong>
                  <p>Ajoutez l’application à votre écran d’accueil.</p>
                </div>
                <button className="settings-action" onClick={() => void installApplication()}>
                  Installer
                </button>
              </article>
              <article>
                <div className="settings-icon">
                  <Bell size={19} />
                </div>
                <div>
                  <strong>Notifications</strong>
                  <p>
                    {notificationPermission === "granted"
                      ? "Autorisées dans ce navigateur."
                      : "Facultatives ; les rappels Ancre restent gérés par Ancre."}
                  </p>
                </div>
                <button
                  className="settings-action"
                  onClick={() => void enableNotifications()}
                  disabled={
                    notificationPermission === "granted" ||
                    notificationPermission === "unsupported"
                  }
                >
                  {notificationPermission === "granted" ? "Autorisées" : "Autoriser"}
                </button>
              </article>
              <article>
                <div className="settings-icon">
                  <FileJson size={19} />
                </div>
                <div>
                  <strong>Sauvegarde locale</strong>
                  <p>Exportez ou restaurez notes, favoris, plans et préférences.</p>
                </div>
                <div className="settings-button-group">
                  <button onClick={exportBackup}>
                    <Download size={14} /> Exporter
                  </button>
                  <button onClick={() => backupInputRef.current?.click()}>
                    <Upload size={14} /> Importer
                  </button>
                  <input
                    ref={backupInputRef}
                    className="sr-only"
                    type="file"
                    accept="application/json"
                    onChange={importBackup}
                  />
                </div>
              </article>
              <article>
                <div className="settings-icon">
                  <BookMarked size={19} />
                </div>
                <div>
                  <strong>Traductions et licences</strong>
                  <p>
                    Louis Segond 1910 et Bible J.N. Darby · français · domaine public ·
                    source eBible.org.
                  </p>
                </div>
                <div className="license-actions">
                  {catalog.translations.map((item) => (
                    <a
                      key={item.id}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.abbreviation}
                    </a>
                  ))}
                </div>
              </article>
              <article className="danger-setting">
                <div className="settings-icon">
                  <Trash2 size={19} />
                </div>
                <div>
                  <strong>Effacer les données locales</strong>
                  <p>Supprime définitivement les données de cet appareil.</p>
                </div>
                <button className="danger-button" onClick={() => void resetApplication()}>
                  Effacer
                </button>
              </article>
            </div>
          </section>
        )}
      </main>

      {selected.length > 0 && activeView === "read" && (
        <div
          className="selection-bar"
          role="toolbar"
          aria-label="Actions sur la sélection"
          inert={modalActive}
        >
          <div className="selection-info">
            <span>{selected.length}</span>
            <div>
              <strong>{selectedReference}</strong>
              <small>
                {selected.length} verset{selected.length > 1 ? "s" : ""} sélectionné
                {selected.length > 1 ? "s" : ""}
              </small>
            </div>
          </div>
          <div className="selection-actions">
            <div className="action-wrap">
              <button
                onClick={() => setHighlightOpen(!highlightOpen)}
                aria-label="Surligner la sélection"
                aria-expanded={highlightOpen}
              >
                <Highlighter size={18} />
                <span>Surligner</span>
              </button>
              {highlightOpen && (
                <div className="color-popover" aria-label="Couleur du surlignage">
                  {highlightColors.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => applyHighlight(item.key)}
                      title={item.label}
                      aria-label={item.label}
                      style={{ background: item.color }}
                    />
                  ))}
                  <button
                    className="clear-highlight"
                    onClick={() => applyHighlight()}
                    title="Supprimer"
                    aria-label="Supprimer le surlignage"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
            <button onClick={openNoteEditor} aria-label="Commenter la sélection">
              <MessageSquareText size={18} />
              <span>Commenter</span>
            </button>
            <button
              onClick={() => setAncreOpen(true)}
              className="ancre-action"
              aria-label="Envoyer la sélection vers Ancre"
            >
              <Anchor size={18} />
              <span>Envoyer vers Ancre</span>
            </button>
            <button
              onClick={addSelectionToSermon}
              aria-label="Ajouter la sélection à une prédication"
            >
              <Feather size={18} />
              <span>Prédication</span>
            </button>
            <button
              onClick={() => setCompare(true)}
              aria-label="Comparer les traductions"
            >
              <Columns3 size={18} />
              <span>Comparer</span>
            </button>
            <button onClick={copySelection} aria-label="Copier la sélection">
              <Copy size={18} />
              <span>Copier</span>
            </button>
            <button onClick={shareSelection} aria-label="Partager la sélection">
              <Share2 size={18} />
              <span>Partager</span>
            </button>
          </div>
          <button
            className="selection-close"
            onClick={() => setSelected([])}
            aria-label="Annuler la sélection"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {noteOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNoteOpen(false)}>
          <section
            className="modal note-modal"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="note-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setNoteOpen(false)}
              aria-label="Fermer la note"
            >
              <X size={19} />
            </button>
            <span className="modal-kicker">NOTE PERSONNELLE</span>
            <h2 id="note-dialog-title">{selectedReference}</h2>
            <p className="modal-verse">{selectedText}</p>
            <label>
              Titre
              <input
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Titre de la note"
              />
            </label>
            <label>
              Votre réflexion
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Ce passage me rappelle…"
              />
            </label>
            <label>
              Étiquettes
              <input
                value={noteTags}
                onChange={(event) => setNoteTags(event.target.value)}
                placeholder="amour, promesse, étude"
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setNoteOpen(false)}>Annuler</button>
              <button className="primary" onClick={saveNote}>
                Enregistrer la note
              </button>
            </div>
          </section>
        </div>
      )}

      {ancreOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAncreOpen(false)}>
          <section
            className="modal ancre-modal"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="ancre-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setAncreOpen(false)}
              aria-label="Fermer l’envoi vers Ancre"
            >
              <X size={19} />
            </button>
            <div className="modal-brand">
              <div>
                <Anchor size={20} />
              </div>
              <span>ENVOYER VERS ANCRE</span>
            </div>
            <h2 id="ancre-dialog-title">{selectedReference}</h2>
            <p className="modal-verse">{selectedText}</p>
            <div className="modal-fields">
              <label>
                TRADUCTION
                <input
                  value={currentBible?.metadata.name ?? translation}
                  readOnly
                />
              </label>
              <label>
                DIFFICULTÉ
                <select
                  value={ancreDifficulty}
                  onChange={(event) =>
                    setAncreDifficulty(
                      event.target.value as AncreImport["difficulty"],
                    )
                  }
                >
                  <option value="easy">Facile</option>
                  <option value="medium">Intermédiaire</option>
                  <option value="hard">Difficile</option>
                </select>
              </label>
              <label className="full">
                THÈME
                <input
                  value={ancreTheme}
                  onChange={(event) => setAncreTheme(event.target.value)}
                />
              </label>
              <label className="full">
                NOTE FACULTATIVE
                <textarea
                  value={ancreNote}
                  onChange={(event) => setAncreNote(event.target.value)}
                  placeholder="Ajouter une intention de mémorisation…"
                />
              </label>
            </div>
            <div className="offline-notice">
              {online ? <Wifi size={15} /> : <WifiOff size={15} />}{" "}
              {online
                ? "Ancre s’ouvrira pour prévisualiser et confirmer l’import."
                : "Hors connexion : le passage est conservé sur cet appareil."}
            </div>
            <div className="modal-actions stacked-mobile">
              <button onClick={() => setAncreOpen(false)}>Annuler</button>
              <button onClick={() => addToAncre(false)}>Garder pour plus tard</button>
              <button className="primary" onClick={() => addToAncre(true)}>
                <Sparkles size={16} /> Ajouter et ouvrir Ancre
              </button>
            </div>
          </section>
        </div>
      )}

      {strongOpen && (
        <div className="modal-backdrop" onMouseDown={() => setStrongOpen(false)}>
          <section
            className="modal strong-modal"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="strong-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setStrongOpen(false)}
              aria-label="Fermer la fiche Strong"
            >
              <X size={19} />
            </button>
            <span className="modal-kicker">
              CONCORDANCE STRONG · {strongSelected.id}
            </span>
            <div className="greek">{strongSelected.original}</div>
            <h2 id="strong-dialog-title">{strongSelected.transliteration}</h2>
            <p className="pronunciation">{strongSelected.kind}</p>
            <div className="definition">
              <span>DÉFINITION</span>
              <p>{strongSelected.definition}</p>
            </div>
            <div className="strong-occurrences">
              <span>PASSAGES ASSOCIÉS</span>
              <p>{strongSelected.occurrences}</p>
            </div>
            <small className="source-note">
              Concordance de base · définitions synthétiques · vérifiez le contexte du
              texte original.
            </small>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={16} />
          {toast}
        </div>
      )}

      <nav
        className="mobile-nav"
        aria-label="Navigation mobile"
        inert={modalActive || (isMobile && mobileMenu)}
      >
        {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeView === id ? "active" : ""}
            onClick={() => setActiveView(id)}
            aria-current={activeView === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label === "Prédications" ? "Plans" : label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
