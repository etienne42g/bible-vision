"use client";

import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  Columns3,
  Copy,
  Download,
  Feather,
  FileText,
  Heart,
  Highlighter,
  Home,
  Library,
  Menu,
  MessageSquareText,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Sun,
  Text,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View =
  | "read"
  | "search"
  | "study"
  | "ancre"
  | "sermons"
  | "library"
  | "settings";
type Translation = "LSG" | "DARBY";
type Theme = "light" | "sepia" | "dark";

type Passage = {
  book: string;
  chapter: number;
  translation: Translation;
  verses: { n: number; text: string }[];
};

type AncreImport = {
  id: string;
  reference: string;
  text: string;
  status: "synchronisé" | "en attente";
  createdAt: string;
};

const passages: Passage[] = [
  {
    book: "Jean",
    chapter: 3,
    translation: "LSG",
    verses: [
      { n: 14, text: "Et comme Moïse éleva le serpent dans le désert, il faut de même que le Fils de l’homme soit élevé," },
      { n: 15, text: "afin que quiconque croit en lui ait la vie éternelle." },
      { n: 16, text: "Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle." },
      { n: 17, text: "Dieu, en effet, n’a pas envoyé son Fils dans le monde pour qu’il juge le monde, mais pour que le monde soit sauvé par lui." },
      { n: 18, text: "Celui qui croit en lui n’est point jugé ; mais celui qui ne croit pas est déjà jugé, parce qu’il n’a pas cru au nom du Fils unique de Dieu." },
      { n: 19, text: "Et ce jugement c’est que, la lumière étant venue dans le monde, les hommes ont préféré les ténèbres à la lumière, parce que leurs œuvres étaient mauvaises." },
      { n: 20, text: "Car quiconque fait le mal hait la lumière, et ne vient point à la lumière, de peur que ses œuvres ne soient dévoilées ;" },
      { n: 21, text: "mais celui qui agit selon la vérité vient à la lumière, afin que ses œuvres soient manifestées, parce qu’elles sont faites en Dieu." },
    ],
  },
  {
    book: "Jean",
    chapter: 3,
    translation: "DARBY",
    verses: [
      { n: 14, text: "Et comme Moïse éleva le serpent dans le désert, ainsi il faut que le fils de l’homme soit élevé," },
      { n: 15, text: "afin que quiconque croit en lui ne périsse pas, mais qu’il ait la vie éternelle." },
      { n: 16, text: "Car Dieu a tant aimé le monde, qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse pas, mais qu’il ait la vie éternelle." },
      { n: 17, text: "Car Dieu n’a pas envoyé son Fils dans le monde afin qu’il jugeât le monde, mais afin que le monde fût sauvé par lui." },
      { n: 18, text: "Celui qui croit en lui n’est pas jugé, mais celui qui ne croit pas est déjà jugé, parce qu’il n’a pas cru au nom du Fils unique de Dieu." },
      { n: 19, text: "Or c’est ici le jugement, que la lumière est venue dans le monde, et que les hommes ont mieux aimé les ténèbres que la lumière, car leurs œuvres étaient mauvaises ;" },
      { n: 20, text: "car quiconque fait des choses mauvaises hait la lumière, et ne vient pas à la lumière, de peur que ses œuvres ne soient reprises ;" },
      { n: 21, text: "mais celui qui pratique la vérité vient à la lumière, afin que ses œuvres soient manifestées, qu’elles sont faites en Dieu." },
    ],
  },
  {
    book: "Psaumes",
    chapter: 23,
    translation: "LSG",
    verses: [
      { n: 1, text: "L’Éternel est mon berger : je ne manquerai de rien." },
      { n: 2, text: "Il me fait reposer dans de verts pâturages, il me dirige près des eaux paisibles." },
      { n: 3, text: "Il restaure mon âme, il me conduit dans les sentiers de la justice, à cause de son nom." },
      { n: 4, text: "Quand je marche dans la vallée de l’ombre de la mort, je ne crains aucun mal, car tu es avec moi : ta houlette et ton bâton me rassurent." },
      { n: 5, text: "Tu dresses devant moi une table, en face de mes adversaires ; tu oins d’huile ma tête, et ma coupe déborde." },
      { n: 6, text: "Oui, le bonheur et la grâce m’accompagneront tous les jours de ma vie, et j’habiterai dans la maison de l’Éternel jusqu’à la fin de mes jours." },
    ],
  },
  {
    book: "Psaumes",
    chapter: 23,
    translation: "DARBY",
    verses: [
      { n: 1, text: "L’Éternel est mon berger : je ne manquerai de rien." },
      { n: 2, text: "Il me fait reposer dans de verts pâturages, il me mène à des eaux paisibles." },
      { n: 3, text: "Il restaure mon âme ; il me conduit dans des sentiers de justice, à cause de son nom." },
      { n: 4, text: "Même quand je marcherais par la vallée de l’ombre de la mort, je ne craindrai aucun mal ; car tu es avec moi." },
      { n: 5, text: "Tu dresses devant moi une table, en la présence de mes ennemis ; tu as oint ma tête d’huile, ma coupe est comble." },
      { n: 6, text: "Oui, la bonté et la gratuité me suivront tous les jours de ma vie, et mon habitation sera dans la maison de l’Éternel pour de longs jours." },
    ],
  },
  {
    book: "Romains",
    chapter: 8,
    translation: "LSG",
    verses: [
      { n: 26, text: "De même aussi l’Esprit nous aide dans notre faiblesse, car nous ne savons pas ce qu’il nous convient de demander dans nos prières." },
      { n: 27, text: "Et celui qui sonde les cœurs connaît quelle est la pensée de l’Esprit." },
      { n: 28, text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein." },
      { n: 31, text: "Si Dieu est pour nous, qui sera contre nous ?" },
      { n: 37, text: "Mais dans toutes ces choses nous sommes plus que vainqueurs par celui qui nous a aimés." },
      { n: 38, text: "Car j’ai l’assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir," },
      { n: 39, text: "ni les puissances, ni la hauteur, ni la profondeur, ni aucune autre créature ne pourra nous séparer de l’amour de Dieu manifesté en Jésus-Christ notre Seigneur." },
    ],
  },
  {
    book: "Romains",
    chapter: 8,
    translation: "DARBY",
    verses: [
      { n: 26, text: "De même aussi l’Esprit nous est en aide dans notre infirmité ; car nous ne savons pas ce qu’il faut demander comme il convient." },
      { n: 27, text: "Mais celui qui sonde les cœurs sait quelle est la pensée de l’Esprit." },
      { n: 28, text: "Mais nous savons que toutes choses travaillent ensemble pour le bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son propos." },
      { n: 31, text: "Si Dieu est pour nous, qui sera contre nous ?" },
      { n: 37, text: "Au contraire, dans toutes ces choses, nous sommes plus que vainqueurs par celui qui nous a aimés." },
      { n: 38, text: "Car je suis assuré que ni mort, ni vie, ni anges, ni principautés, ni choses présentes, ni choses à venir," },
      { n: 39, text: "ni puissances, ni hauteur, ni profondeur, ni aucune autre créature, ne pourra nous séparer de l’amour de Dieu." },
    ],
  },
];

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "read", label: "Lire", icon: BookOpen },
  { id: "search", label: "Rechercher", icon: Search },
  { id: "study", label: "Étudier", icon: Sparkles },
  { id: "ancre", label: "Ancre", icon: Anchor },
  { id: "sermons", label: "Prédications", icon: Feather },
  { id: "library", label: "Bibliothèque", icon: Library },
];

const highlightColors = [
  { key: "yellow", color: "#f7d878", label: "Promesse" },
  { key: "green", color: "#a9d5b5", label: "Encouragement" },
  { key: "blue", color: "#9ccbd8", label: "Vérité" },
  { key: "red", color: "#e8a29a", label: "Avertissement" },
  { key: "purple", color: "#c5add6", label: "Prière" },
  { key: "orange", color: "#efb77c", label: "À approfondir" },
];

const references = [
  { book: "Jean", chapter: 3, label: "Jean 3" },
  { book: "Psaumes", chapter: 23, label: "Psaume 23" },
  { book: "Romains", chapter: 8, label: "Romains 8" },
];

function cls(...values: (string | false | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<View>("read");
  const [book, setBook] = useState("Jean");
  const [chapter, setChapter] = useState(3);
  const [translation, setTranslation] = useState<Translation>("LSG");
  const [selected, setSelected] = useState<number[]>([16, 17]);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(20);
  const [theme, setTheme] = useState<Theme>("light");
  const [showNumbers, setShowNumbers] = useState(true);
  const [compare, setCompare] = useState(false);
  const [online, setOnline] = useState(true);
  const [referenceInput, setReferenceInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [ancreOpen, setAncreOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [strongOpen, setStrongOpen] = useState(false);
  const [imports, setImports] = useState<AncreImport[]>([]);
  const [sermonTitle, setSermonTitle] = useState("L’amour qui vient à notre rencontre");
  const [sermonItems, setSermonItems] = useState([
    "Dieu prend l’initiative — Jean 3:16",
    "La lumière révèle le cœur — Jean 3:19–21",
    "Répondre par la foi — application",
  ]);
  const [hydrated, setHydrated] = useState(false);

  const current = useMemo(
    () =>
      passages.find(
        (item) =>
          item.book === book &&
          item.chapter === chapter &&
          item.translation === translation,
      ) ?? passages[0],
    [book, chapter, translation],
  );
  const comparison = useMemo(
    () =>
      passages.find(
        (item) =>
          item.book === book &&
          item.chapter === chapter &&
          item.translation !== translation,
      ),
    [book, chapter, translation],
  );

  const selectionKey = `${book}-${chapter}-${selected.slice().sort((a, b) => a - b).join(",")}`;
  const selectedVerses = current.verses.filter((v) => selected.includes(v.n));
  const selectedReference = selectedVerses.length
    ? `${book} ${chapter}:${Math.min(...selected)}${selected.length > 1 ? `–${Math.max(...selected)}` : ""}`
    : `${book} ${chapter}`;
  const selectedText = selectedVerses.map((verse) => `${verse.n} ${verse.text}`).join(" ");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("bible-vision-state") || "{}");
      if (saved.highlights) setHighlights(saved.highlights);
      if (saved.notes) setNotes(saved.notes);
      if (saved.favorites) setFavorites(saved.favorites);
      if (saved.imports) setImports(saved.imports);
      if (saved.theme) setTheme(saved.theme);
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (saved.book) setBook(saved.book);
      if (saved.chapter) setChapter(saved.chapter);
      if (saved.translation) setTranslation(saved.translation);
    } catch {
      // A fresh local library is created when stored data is unreadable.
    }
    setHydrated(true);
    setOnline(navigator.onLine);
    const setConnected = () => setOnline(true);
    const setDisconnected = () => setOnline(false);
    window.addEventListener("online", setConnected);
    window.addEventListener("offline", setDisconnected);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    return () => {
      window.removeEventListener("online", setConnected);
      window.removeEventListener("offline", setDisconnected);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "bible-vision-state",
      JSON.stringify({
        highlights,
        notes,
        favorites,
        imports,
        theme,
        fontSize,
        book,
        chapter,
        translation,
      }),
    );
  }, [
    hydrated,
    highlights,
    notes,
    favorites,
    imports,
    theme,
    fontSize,
    book,
    chapter,
    translation,
  ]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function goToReference(value = referenceInput) {
    const normalized = value.toLowerCase().replace(/[.,]/g, ":").trim();
    const found =
      normalized.includes("psaume") || normalized.includes("ps ")
        ? references[1]
        : normalized.includes("romain")
          ? references[2]
          : normalized.includes("jean")
            ? references[0]
            : undefined;
    if (found) {
      setBook(found.book);
      setChapter(found.chapter);
      setSelected([]);
      setActiveView("read");
      setReferenceInput("");
      setToast(`${found.label} ouvert`);
    } else {
      setToast("Essayez « Jean 3:16 », « Psaume 23 » ou « Romains 8 »");
    }
  }

  function toggleVerse(n: number) {
    setSelected((previous) =>
      previous.includes(n)
        ? previous.filter((value) => value !== n)
        : [...previous, n],
    );
  }

  function applyHighlight(color: string) {
    const next = { ...highlights };
    selected.forEach((verse) => {
      next[`${book}-${chapter}-${verse}`] = color;
    });
    setHighlights(next);
    setHighlightOpen(false);
    setToast(`${selected.length} verset${selected.length > 1 ? "s" : ""} surligné${selected.length > 1 ? "s" : ""}`);
  }

  function saveNote() {
    if (noteDraft.trim()) setNotes((previous) => ({ ...previous, [selectionKey]: noteDraft.trim() }));
    setNoteOpen(false);
    setToast("Note enregistrée dans votre bibliothèque");
  }

  function addToAncre(start = false) {
    const duplicate = imports.find(
      (item) => item.reference === selectedReference && item.text === selectedText,
    );
    if (duplicate) {
      setToast("Ce passage est déjà dans Ancre — aucun doublon créé");
      setAncreOpen(false);
      return;
    }
    const item: AncreImport = {
      id: crypto.randomUUID(),
      reference: selectedReference,
      text: selectedText,
      status: online ? "synchronisé" : "en attente",
      createdAt: new Date().toISOString(),
    };
    setImports((previous) => [item, ...previous]);
    setAncreOpen(false);
    setToast(online ? "Passage ajouté à Ancre" : "Passage mis en attente pour Ancre");
    if (start) {
      window.open(
        `https://memoryverses.etiennegrz.fr/?import=${encodeURIComponent(selectedReference)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  function copySelection() {
    navigator.clipboard?.writeText(`${selectedText}\n— ${selectedReference} (${translation})`);
    setToast("Passage copié");
  }

  function shareSelection() {
    if (navigator.share) {
      navigator.share({ title: selectedReference, text: selectedText }).catch(() => undefined);
    } else {
      copySelection();
    }
  }

  function addSelectionToSermon() {
    setSermonItems((items) => [...items, `${selectedReference} — ${selectedText.slice(0, 72)}…`]);
    setActiveView("sermons");
    setSelected([]);
    setToast("Passage ajouté à la prédication");
  }

  function exportSermon() {
    const content = `# ${sermonTitle}\n\n${sermonItems
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plan-predication.md";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Plan exporté en Markdown");
  }

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return passages
      .filter((item) => item.translation === translation)
      .flatMap((item) =>
        item.verses
          .filter((verse) => verse.text.toLowerCase().includes(term))
          .map((verse) => ({ ...verse, book: item.book, chapter: item.chapter })),
      )
      .slice(0, 8);
  }, [searchTerm, translation]);

  return (
    <div className={cls("app-shell", `theme-${theme}`)}>
      <aside className={cls("sidebar", mobileMenu && "mobile-open")}>
        <div className="brand">
          <div className="brand-mark"><BookOpen size={22} strokeWidth={1.8} /></div>
          <div>
            <strong>Bible Vision</strong>
            <span>Lire · Étudier · Grandir</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Fermer le menu">
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
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "ancre" && imports.length > 0 && <b className="nav-badge">{imports.length}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setActiveView("settings")}>
            <Settings size={19} strokeWidth={1.8} /> Réglages
          </button>
          <div className="profile">
            <div className="avatar">ÉG</div>
            <div><strong>Mon espace</strong><span>Données sur cet appareil</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Ouvrir le menu">
            <Menu size={22} />
          </button>
          <div className="quick-search">
            <Search size={18} />
            <input
              value={referenceInput}
              onChange={(event) => setReferenceInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && goToReference()}
              placeholder="Rechercher une référence, un mot…"
              aria-label="Recherche rapide"
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className={cls("connection", !online && "offline")}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            {online ? "Synchronisé" : "Hors connexion"}
          </div>
          <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
          <button className="avatar top-avatar">ÉG</button>
        </header>

        {activeView === "read" && (
          <div className={cls("reader-layout", compare && "is-comparing")}>
            <section className="reader-panel">
              <div className="reader-toolbar">
                <div className="passage-selector">
                  <button className="book-select">
                    <span>{book}</span><ChevronDown size={16} />
                  </button>
                  <button className="chapter-select">
                    <span>Chapitre {chapter}</span><ChevronDown size={16} />
                  </button>
                </div>
                <div className="reader-controls">
                  <button className={cls("control-button", favorites.includes(`${book}-${chapter}`) && "active")}
                    onClick={() => setFavorites((list) =>
                      list.includes(`${book}-${chapter}`) ? list.filter((item) => item !== `${book}-${chapter}`) : [...list, `${book}-${chapter}`]
                    )} aria-label="Ajouter aux favoris">
                    <Heart size={17} fill={favorites.includes(`${book}-${chapter}`) ? "currentColor" : "none"} />
                  </button>
                  <button className={cls("control-button", compare && "active")} onClick={() => setCompare(!compare)} aria-label="Comparer les traductions">
                    <Columns3 size={17} />
                  </button>
                  <div className="font-control">
                    <button onClick={() => setFontSize(Math.max(16, fontSize - 2))} aria-label="Réduire le texte"><Minus size={14} /></button>
                    <Text size={16} />
                    <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} aria-label="Agrandir le texte"><Plus size={14} /></button>
                  </div>
                  <button className="control-button" onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "sepia" : "dark")} aria-label="Changer de thème">
                    {theme === "dark" ? <Moon size={17} /> : theme === "sepia" ? <Sun size={17} /> : <Sun size={17} />}
                  </button>
                </div>
              </div>

              <div className="chapter-heading">
                <div className="eyebrow">NOUVEAU TESTAMENT · ÉVANGILE</div>
                <div className="chapter-title-row">
                  <button className="chapter-arrow" aria-label="Chapitre précédent"><ArrowLeft size={19} /></button>
                  <div>
                    <h1>{book} <span>{chapter}</span></h1>
                    <p>{book === "Jean" ? "Jésus et Nicodème — L’amour de Dieu" : book === "Psaumes" ? "L’Éternel est mon berger" : "La vie selon l’Esprit"}</p>
                  </div>
                  <button className="chapter-arrow" aria-label="Chapitre suivant"><ArrowRight size={19} /></button>
                </div>
                <div className="translation-row">
                  <button className="translation-picker" onClick={() => setTranslation(translation === "LSG" ? "DARBY" : "LSG")}>
                    <b>{translation}</b>
                    <span>{translation === "LSG" ? "Louis Segond 1910" : "Bible Darby"}</span>
                    <ChevronDown size={15} />
                  </button>
                  <button className={cls("numbers-toggle", showNumbers && "active")} onClick={() => setShowNumbers(!showNumbers)}>
                    N° versets
                  </button>
                </div>
              </div>

              <article className="scripture" style={{ "--reader-size": `${fontSize}px` } as React.CSSProperties}>
                {current.verses.map((verse) => {
                  const isSelected = selected.includes(verse.n);
                  const color = highlights[`${book}-${chapter}-${verse.n}`];
                  return (
                    <div
                      key={verse.n}
                      className={cls("verse", isSelected && "selected")}
                      style={{ "--highlight": color ? highlightColors.find((item) => item.key === color)?.color : "transparent" } as React.CSSProperties}
                      onClick={() => toggleVerse(verse.n)}
                    >
                      {showNumbers && <button className="verse-number" aria-label={`Sélectionner le verset ${verse.n}`}>{verse.n}</button>}
                      <p>
                        {book === "Jean" && verse.n === 16 ? (
                          <>
                            Car Dieu a tant{" "}
                            <button className="strong-word" onClick={(event) => { event.stopPropagation(); setStrongOpen(true); }}>
                              aimé
                            </button>{" "}
                            le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.
                          </>
                        ) : verse.text}
                      </p>
                      {notes[`${book}-${chapter}-${verse.n}`] && <MessageSquareText className="verse-note" size={15} />}
                      {isSelected && <span className="selection-check"><Check size={12} /></span>}
                    </div>
                  );
                })}
              </article>

              {compare && comparison && (
                <section className="comparison-panel">
                  <div className="comparison-title">
                    <div><span>COMPARAISON</span><h2>{comparison.translation === "LSG" ? "Louis Segond 1910" : "Bible Darby"}</h2></div>
                    <button onClick={() => setCompare(false)} aria-label="Fermer la comparaison"><X size={18} /></button>
                  </div>
                  {comparison.verses.map((verse) => (
                    <div className="comparison-verse" key={verse.n}>
                      <b>{verse.n}</b><p>{verse.text}</p>
                    </div>
                  ))}
                </section>
              )}
            </section>

            {!compare && (
              <aside className="context-panel">
                <section className="daily-card">
                  <span className="card-kicker">VERSER DU JOUR</span>
                  <div className="daily-icon"><Sun size={20} /></div>
                  <blockquote>« Car Dieu a tant aimé le monde qu’il a donné son Fils unique… »</blockquote>
                  <p>Jean 3:16 · LSG</p>
                  <button onClick={() => { setSelected([16]); setAncreOpen(true); }}>
                    <Anchor size={16} /> Mémoriser avec Ancre
                  </button>
                </section>

                <section className="side-section">
                  <div className="side-title"><span>PARCOURS RÉCENTS</span><button>Voir tout</button></div>
                  {references.map((ref, index) => (
                    <button className="recent-row" key={ref.label} onClick={() => { setBook(ref.book); setChapter(ref.chapter); setSelected([]); }}>
                      <span className={cls("recent-dot", `dot-${index + 1}`)} />
                      <div><strong>{ref.label}</strong><small>{index === 0 ? "Il y a 2 min" : index === 1 ? "Hier" : "Il y a 3 jours"}</small></div>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </section>

                <section className="side-section download-card">
                  <div className="side-title"><span>HORS CONNEXION</span><b>2 versions</b></div>
                  <div className="storage-line"><span style={{ width: "42%" }} /></div>
                  <div className="storage-copy"><span>84 Mo utilisés</span><span>200 Mo</span></div>
                  <button><Download size={15} /> Gérer les téléchargements</button>
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
              <p>Retrouvez un mot, une expression ou une référence dans vos traductions.</p>
            </div>
            <div className="large-search">
              <Search size={21} />
              <input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Ex. lumière, espérance, Jean 3:16…" />
              <button>{translation}<ChevronDown size={14} /></button>
            </div>
            <div className="filter-row">
              <button className="active">Toute la Bible</button><button>Ancien Testament</button><button>Nouveau Testament</button><button>Mes notes</button>
            </div>
            <div className="results-list">
              {searchTerm && <p className="result-count">{searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}</p>}
              {!searchTerm && (
                <div className="empty-state">
                  <div><Search size={30} /></div><h2>Cherchez dans la Parole</h2><p>Essayez « lumière », « aimé » ou « berger ».</p>
                </div>
              )}
              {searchResults.map((result) => (
                <button className="search-result" key={`${result.book}-${result.chapter}-${result.n}`} onClick={() => {
                  setBook(result.book); setChapter(result.chapter); setSelected([result.n]); setActiveView("read");
                }}>
                  <span>{result.book} {result.chapter}:{result.n}</span>
                  <p>{result.text}</p><ArrowRight size={17} />
                </button>
              ))}
            </div>
          </section>
        )}

        {activeView === "study" && (
          <section className="content-page">
            <div className="page-heading">
              <span>OUTILS D’ÉTUDE</span><h1>Approfondir le texte</h1>
              <p>Concordance, mots originaux et traductions réunis au même endroit.</p>
            </div>
            <div className="study-grid">
              <article className="feature-card strong-card">
                <div className="feature-icon">α</div><span>CONCORDANCE STRONG</span>
                <h2>ἀγαπάω</h2><p className="transliteration">agapaō · G25</p>
                <p>Aimer, chérir, rechercher le bien de l’autre. Un amour exprimé par un choix et une action.</p>
                <button onClick={() => setStrongOpen(true)}>Voir la fiche complète <ArrowRight size={16} /></button>
              </article>
              <article className="feature-card">
                <div className="feature-icon"><Columns3 size={22} /></div><span>TRADUCTIONS</span>
                <h2>Comparer Jean 3:16</h2><p>Placez Louis Segond et Darby côte à côte pour observer chaque nuance.</p>
                <button onClick={() => { setActiveView("read"); setBook("Jean"); setChapter(3); setSelected([16]); setCompare(true); }}>Comparer maintenant <ArrowRight size={16} /></button>
              </article>
              <article className="feature-card">
                <div className="feature-icon"><BookMarked size={22} /></div><span>PASSAGES PARALLÈLES</span>
                <h2>Suivre le fil</h2><p>Explorez Romains 5:8, 1 Jean 4:9 et Éphésiens 2:4 autour de l’amour de Dieu.</p>
                <button>Explorer les références <ArrowRight size={16} /></button>
              </article>
            </div>
          </section>
        )}

        {activeView === "ancre" && (
          <section className="content-page">
            <div className="page-heading heading-row">
              <div><span>MÉMORISER AVEC ANCRE</span><h1>Faire habiter la Parole</h1><p>Vos passages importés, révisions et progrès en un seul lieu.</p></div>
              <a className="primary-link" href="https://memoryverses.etiennegrz.fr" target="_blank" rel="noreferrer"><Anchor size={17} /> Ouvrir Ancre</a>
            </div>
            <div className="ancre-stats">
              <article><span>À réviser aujourd’hui</span><strong>4</strong><small>≈ 8 minutes</small></article>
              <article><span>En cours</span><strong>{Math.max(3, imports.length)}</strong><small>2 presque acquises</small></article>
              <article><span>Série actuelle</span><strong>12 <i>jours</i></strong><small>Votre meilleur : 18 jours</small></article>
            </div>
            <section className="review-card">
              <div className="review-copy"><span>PROCHAINE RÉVISION</span><h2>Romains 8:28</h2><p>« Nous savons, du reste, que toutes choses concourent au bien… »</p></div>
              <button onClick={() => window.open("https://memoryverses.etiennegrz.fr", "_blank", "noopener,noreferrer")}><Sparkles size={18} /> Commencer l’exercice</button>
            </section>
            <div className="section-heading"><div><span>BOÎTE DE RÉCEPTION</span><h2>Passages importés</h2></div><small>{imports.length} passage{imports.length > 1 ? "s" : ""}</small></div>
            <div className="imports-list">
              {imports.length === 0 && <div className="empty-imports"><Anchor size={25} /><p>Sélectionnez un passage dans le lecteur, puis choisissez « Envoyer vers Ancre ».</p></div>}
              {imports.map((item) => (
                <article key={item.id} className="import-row">
                  <div className="import-mark"><Anchor size={17} /></div>
                  <div><strong>{item.reference}</strong><p>{item.text.slice(0, 108)}…</p><small>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</small></div>
                  <span className={cls("status-pill", item.status === "en attente" && "pending")}>{item.status}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === "sermons" && (
          <section className="content-page sermon-page">
            <div className="page-heading heading-row">
              <div><span>ATELIER DE PRÉDICATION</span><h1>Préparer avec clarté</h1><p>Rassemblez vos textes, idées et applications dans un plan vivant.</p></div>
              <button className="primary-link" onClick={exportSermon}><Download size={17} /> Exporter le plan</button>
            </div>
            <div className="sermon-workspace">
              <aside className="sermon-meta">
                <label>TITRE<input value={sermonTitle} onChange={(event) => setSermonTitle(event.target.value)} /></label>
                <label>PASSAGE PRINCIPAL<input defaultValue="Jean 3:16–21" /></label>
                <div className="meta-pair"><label>DURÉE<input defaultValue="25 min" /></label><label>STATUT<select defaultValue="brouillon"><option>brouillon</option><option>prêt</option><option>archivé</option></select></label></div>
                <label>OBJECTIF<textarea defaultValue="Inviter chacun à recevoir l’amour de Dieu et à marcher dans la lumière." /></label>
              </aside>
              <div className="sermon-outline">
                <div className="outline-heading"><div><span>PLAN EN TROIS POINTS</span><h2>Structure</h2></div><button onClick={() => setSermonItems((items) => [...items, "Nouvelle partie"])}><Plus size={16} /> Ajouter</button></div>
                {sermonItems.map((item, index) => (
                  <article className="outline-item" key={`${item}-${index}`}>
                    <span className="drag-handle">⠿</span><b>0{index + 1}</b>
                    <input value={item} onChange={(event) => setSermonItems((items) => items.map((value, i) => i === index ? event.target.value : value))} />
                    <small>{index === 0 ? "6 min" : index === 1 ? "8 min" : "7 min"}</small>
                  </article>
                ))}
                <div className="duration-total"><span>Durée estimée</span><strong>21 min <small>/ 25 min</small></strong></div>
              </div>
            </div>
          </section>
        )}

        {activeView === "library" && (
          <section className="content-page">
            <div className="page-heading"><span>VOTRE COLLECTION</span><h1>Bibliothèque</h1><p>Retrouvez ce que vous avez gardé au fil de votre lecture.</p></div>
            <div className="library-tabs"><button className="active">Tout</button><button>Favoris</button><button>Surlignages</button><button>Notes</button><button>Récents</button></div>
            <div className="library-grid">
              <article className="library-card"><div className="library-icon"><Heart size={20} /></div><span>FAVORIS</span><strong>{favorites.length}</strong><p>chapitre{favorites.length !== 1 ? "s" : ""} enregistré{favorites.length !== 1 ? "s" : ""}</p></article>
              <article className="library-card"><div className="library-icon"><Highlighter size={20} /></div><span>SURLIGNAGES</span><strong>{Object.keys(highlights).length}</strong><p>passage{Object.keys(highlights).length !== 1 ? "s" : ""} classé{Object.keys(highlights).length !== 1 ? "s" : ""}</p></article>
              <article className="library-card"><div className="library-icon"><MessageSquareText size={20} /></div><span>NOTES</span><strong>{Object.keys(notes).length}</strong><p>réflexion{Object.keys(notes).length !== 1 ? "s" : ""} personnelle{Object.keys(notes).length !== 1 ? "s" : ""}</p></article>
              <article className="library-card"><div className="library-icon"><Anchor size={20} /></div><span>ENVOYÉS À ANCRE</span><strong>{imports.length}</strong><p>passage{imports.length !== 1 ? "s" : ""} à mémoriser</p></article>
            </div>
            <div className="section-heading"><div><span>RÉCEMMENT CONSULTÉS</span><h2>Reprendre la lecture</h2></div></div>
            <div className="recent-grid">
              {references.map((ref, index) => (
                <button key={ref.label} onClick={() => { setBook(ref.book); setChapter(ref.chapter); setActiveView("read"); }}>
                  <span>0{index + 1}</span><div><strong>{ref.label}</strong><p>{index === 0 ? "L’amour de Dieu" : index === 1 ? "L’Éternel est mon berger" : "Plus que vainqueurs"}</p></div><ArrowRight size={17} />
                </button>
              ))}
            </div>
          </section>
        )}

        {activeView === "settings" && (
          <section className="content-page settings-page">
            <div className="page-heading"><span>PRÉFÉRENCES</span><h1>Réglages</h1><p>Adaptez Bible Vision à votre manière de lire et d’étudier.</p></div>
            <div className="settings-list">
              <article><div className="settings-icon"><Sun size={19} /></div><div><strong>Apparence</strong><p>Choisissez l’ambiance de lecture.</p></div><div className="theme-switch">{(["light","sepia","dark"] as Theme[]).map((item) => <button key={item} className={theme === item ? "active" : ""} onClick={() => setTheme(item)}>{item === "light" ? "Clair" : item === "sepia" ? "Sépia" : "Sombre"}</button>)}</div></article>
              <article><div className="settings-icon"><Text size={19} /></div><div><strong>Texte biblique</strong><p>Taille actuelle : {fontSize}px.</p></div><div className="font-control large"><button onClick={() => setFontSize(Math.max(16, fontSize - 2))}><Minus size={15} /></button><span>Aa</span><button onClick={() => setFontSize(Math.min(28, fontSize + 2))}><Plus size={15} /></button></div></article>
              <article><div className="settings-icon"><Anchor size={19} /></div><div><strong>Compte Ancre</strong><p>Connectez la mémorisation et la synchronisation.</p></div><a href="https://memoryverses.etiennegrz.fr" target="_blank" rel="noreferrer">Connecter</a></article>
              <article><div className="settings-icon">{online ? <Wifi size={19} /> : <WifiOff size={19} />}</div><div><strong>Mode hors connexion</strong><p>{online ? "Les contenus essentiels sont disponibles hors ligne." : "Vous utilisez la copie enregistrée sur cet appareil."}</p></div><span className="settings-status"><Check size={14} /> Actif</span></article>
            </div>
          </section>
        )}
      </main>

      {selected.length > 0 && activeView === "read" && (
        <div className="selection-bar">
          <div className="selection-info"><span>{selected.length}</span><div><strong>{selectedReference}</strong><small>{selected.length} verset{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}</small></div></div>
          <div className="selection-actions">
            <div className="action-wrap">
              <button onClick={() => setHighlightOpen(!highlightOpen)}><Highlighter size={18} /><span>Surligner</span></button>
              {highlightOpen && <div className="color-popover">{highlightColors.map((item) => <button key={item.key} onClick={() => applyHighlight(item.key)} title={item.label} style={{ background: item.color }} />)}</div>}
            </div>
            <button onClick={() => { setNoteDraft(notes[selectionKey] || ""); setNoteOpen(true); }}><MessageSquareText size={18} /><span>Commenter</span></button>
            <button onClick={() => setAncreOpen(true)} className="ancre-action"><Anchor size={18} /><span>Envoyer vers Ancre</span></button>
            <button onClick={addSelectionToSermon}><Feather size={18} /><span>Prédication</span></button>
            <button onClick={() => setCompare(true)}><Columns3 size={18} /><span>Comparer</span></button>
            <button onClick={copySelection}><Copy size={18} /><span>Copier</span></button>
            <button onClick={shareSelection}><Share2 size={18} /><span>Partager</span></button>
          </div>
          <button className="selection-close" onClick={() => setSelected([])} aria-label="Annuler la sélection"><X size={20} /></button>
        </div>
      )}

      {noteOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNoteOpen(false)}>
          <section className="modal note-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setNoteOpen(false)}><X size={19} /></button>
            <span className="modal-kicker">NOTE PERSONNELLE</span><h2>{selectedReference}</h2>
            <p className="modal-verse">{selectedText}</p>
            <label>Votre réflexion<textarea autoFocus value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Ce passage me rappelle…" /></label>
            <div className="tag-row"><span># amour</span><button><Plus size={13} /> Étiquette</button></div>
            <div className="modal-actions"><button onClick={() => setNoteOpen(false)}>Annuler</button><button className="primary" onClick={saveNote}>Enregistrer la note</button></div>
          </section>
        </div>
      )}

      {ancreOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAncreOpen(false)}>
          <section className="modal ancre-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAncreOpen(false)}><X size={19} /></button>
            <div className="modal-brand"><div><Anchor size={20} /></div><span>ENVOYER VERS ANCRE</span></div>
            <h2>{selectedReference}</h2>
            <p className="modal-verse">{selectedText}</p>
            <div className="modal-fields">
              <label>TRADUCTION<button>{translation === "LSG" ? "Louis Segond 1910" : "Bible Darby"}<ChevronDown size={14} /></button></label>
              <label>DIFFICULTÉ<button>Intermédiaire<ChevronDown size={14} /></button></label>
              <label className="full">THÈME<input defaultValue="Amour de Dieu" /></label>
              <label className="full">NOTE FACULTATIVE<textarea placeholder="Ajouter une intention de mémorisation…" /></label>
            </div>
            <div className="offline-notice">{online ? <Wifi size={15} /> : <WifiOff size={15} />} {online ? "Le passage sera synchronisé avec votre compte Ancre." : "Hors connexion : l’envoi sera repris automatiquement."}</div>
            <div className="modal-actions stacked-mobile"><button onClick={() => setAncreOpen(false)}>Annuler</button><button onClick={() => addToAncre(false)}>Ajouter à Ancre</button><button className="primary" onClick={() => addToAncre(true)}><Sparkles size={16} /> Ajouter et mémoriser</button></div>
          </section>
        </div>
      )}

      {strongOpen && (
        <div className="modal-backdrop" onMouseDown={() => setStrongOpen(false)}>
          <section className="modal strong-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setStrongOpen(false)}><X size={19} /></button>
            <span className="modal-kicker">CONCORDANCE STRONG · G25</span>
            <div className="greek">ἀγαπάω</div><h2>agapaō</h2><p className="pronunciation">a-ga-pa-o · verbe</p>
            <div className="definition"><span>DÉFINITION</span><p>Aimer, accueillir avec affection, estimer et rechercher activement le bien d’une personne.</p></div>
            <div className="strong-stats"><div><strong>143</strong><span>occurrences</span></div><div><strong>9×</strong><span>dans Jean</span></div><div><strong>G25</strong><span>identifiant</span></div></div>
            <button className="wide-secondary">Voir toutes les occurrences <ArrowRight size={16} /></button>
            <small className="source-note">Données lexicales de démonstration · Vérifiez toujours la source originale.</small>
          </section>
        </div>
      )}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}

      <nav className="mobile-nav" aria-label="Navigation mobile">
        {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeView === id ? "active" : ""} onClick={() => setActiveView(id)}>
            <Icon size={20} /><span>{label === "Prédications" ? "Plans" : label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
