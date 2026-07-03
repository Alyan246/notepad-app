import { useState, useRef, useEffect, useCallback } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

const THEMES = [
  {
    id: "classic",
    swatch: "#f7f7f4",
    label: "Classic",
    pageBg: "#d9d9dc",
    lineColor: "#3a3a3a",
    textColor: "#1a1a1a",
    swatchTextColor: "#1a1a1a",
  },
  {
    id: "noir",
    swatch: "#111113",
    label: "Noir",
    pageBg: "#3d3d40",
    lineColor: "#8a8a8f",
    textColor: "#f2f2f2",
    swatchTextColor: "#f2f2f2",
  },
  {
    id: "indigo",
    swatch: "#122064",
    label: "Indigo",
    pageBg: "#dfe2f2",
    lineColor: "#3d4a91",
    textColor: "#1a2040",
    swatchTextColor: "#f2f2f2",
  },
  {
    id: "sepia",
    swatch: "#f6e8ab",
    label: "Sepia",
    pageBg: "#f2e8c9",
    lineColor: "#8a7638",
    textColor: "#4a3d17",
    swatchTextColor: "#4a3418",
  },
  {
    id: "blossom",
    swatch: "#f0a8c8",
    label: "Blossom",
    pageBg: "#f7e3ee",
    lineColor: "#a85a80",
    textColor: "#4a1f34",
    swatchTextColor: "#4a1f34",
  },
];

const LINES_PER_PAGE = 15;
const LINE_HEIGHT = 34;

function emptyPage(id) {
  return { id, html: "" };
}

function PageEditor({
  pageId,
  initialHtml,
  registerRef,
  onFocusPage,
  onInputPage,
  className,
  style,
}) {
  const [html] = useState(initialHtml);

  return (
    <div
      ref={(el) => registerRef(pageId, el)}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => onFocusPage(pageId)}
      onInput={() => onInputPage(pageId)}
      dangerouslySetInnerHTML={{ __html: html }}
      className={className}
      style={style}
      spellCheck={false}
    />
  );
}

export default function App() {
  const [pages, setPages] = useState([emptyPage(1), emptyPage(2)]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [themeId, setThemeId] = useState("classic");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filePath, setFilePath] = useState(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const editorRefs = useRef({});
  const focusedPageId = useRef(pages[0].id);
  const [docVersion, setDocVersion] = useState(0);

  const theme = THEMES.find((t) => t.id === themeId);
  const leftPage = pages[spreadIndex * 2];
  const rightPage = pages[spreadIndex * 2 + 1];

  const refreshFormatState = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshFormatState);
    return () =>
      document.removeEventListener("selectionchange", refreshFormatState);
  }, [refreshFormatState]);

  const applyFormat = (command) => {
    const el = editorRefs.current[focusedPageId.current];
    el?.focus();
    document.execCommand(command);
    refreshFormatState();
  };

  const updatePageContent = (id) => {
    const el = editorRefs.current[id];
    if (!el) return;
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, html: el.innerHTML } : p)),
    );
  };

  const addPagePair = () => {
    setPages((prev) => {
      const nextId = prev.length + 1;
      const updated = [...prev, emptyPage(nextId), emptyPage(nextId + 1)];
      return updated;
    });
    setSpreadIndex((prev) => prev + 1);
  };

  const jumpToPage = () => {
    const input = window.prompt(`Jump to page (1–${pages.length}):`);
    const num = parseInt(input, 10);
    if (!num || num < 1 || num > pages.length) return;
    setSpreadIndex(Math.floor((num - 1) / 2));
  };

  const handleSave = async () => {
    try {
      const el = editorRefs.current[focusedPageId.current];
      const latestPages = el
        ? pages.map((p) =>
            p.id === focusedPageId.current ? { ...p, html: el.innerHTML } : p,
          )
        : pages;

      const path =
        filePath ||
        (await save({
          filters: [{ name: "Notepad file", extensions: ["note"] }],
        }));
      if (!path) return;

      const doc = {
        format: "notepad-app",
        version: 1,
        themeId,
        pages: latestPages.map((p) => ({ id: p.id, html: p.html })),
      };
      await writeTextFile(path, JSON.stringify(doc, null, 2));
      setFilePath(path);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleOpen = async () => {
    try {
      const path = await open({
        filters: [{ name: "Notepad file", extensions: ["note"] }],
      });
      if (!path) return;
      const raw = await readTextFile(path);
      const doc = JSON.parse(raw);

      if (doc.format !== "notepad-app" || !Array.isArray(doc.pages)) {
        console.error("Not a valid .note file");
        return;
      }
      setPages(doc.pages.length ? doc.pages : [emptyPage(1), emptyPage(2)]);
      setDocVersion((v) => v + 1);
      setThemeId(
        THEMES.some((t) => t.id === doc.themeId) ? doc.themeId : "classic",
      );
      setSpreadIndex(0);
      setFilePath(path);
    } catch (err) {
      console.error("Open failed:", err);
    }
  };

  const ruledLines = Array.from({ length: LINES_PER_PAGE });

  const renderPage = (page, pageNumber) => (
    <div
      className="relative flex-1 min-w-0"
      style={{ backgroundColor: theme.pageBg }}
    >
      <div
        className="absolute inset-0 px-8 pt-8 pointer-events-none"
        aria-hidden="true"
      >
        {ruledLines.map((_, i) => (
          <div
            key={i}
            style={{
              height: LINE_HEIGHT,
              borderBottom: `2px dashed ${theme.lineColor}`,
              opacity: 0.55,
            }}
          />
        ))}
      </div>
      {page ? (
        <PageEditor
          key={`${page.id}-${docVersion}`}
          pageId={page.id}
          initialHtml={page.html}
          registerRef={(id, el) => {
            if (el) editorRefs.current[id] = el;
          }}
          onFocusPage={(id) => (focusedPageId.current = id)}
          onInputPage={(id) => updatePageContent(id)}
          className="relative px-8 pt-8 outline-none font-mono text-[15px]"
          style={{
            lineHeight: `${LINE_HEIGHT}px`,
            color: theme.textColor,
            minHeight: LINES_PER_PAGE * LINE_HEIGHT,
          }}
        />
      ) : (
        <div style={{ minHeight: LINES_PER_PAGE * LINE_HEIGHT }} />
      )}
      <span
        className="absolute bottom-4 right-6 text-sm"
        style={{ color: theme.lineColor }}
      >
        {pageNumber}
      </span>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center py-10 px-6"
      style={{
        background:
          "linear-gradient(180deg, #eef1f4 0%, #b6bcc8 55%, #9aa0ae 100%)",
      }}
    >
      {/*Toolbar*/}
      <div className="w-full max-w-4xl flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-transform active:scale-95"
            style={{ backgroundColor: "#dcdde1", color: "#1a1a1a" }}
            aria-label="Menu"
          >
            ☰
          </button>

          <div className="w-3" />

          <button
            onClick={() => applyFormat("bold")}
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-transform active:scale-95"
            style={{
              backgroundColor: activeFormats.bold ? "#1a1a1a" : "#dcdde1",
              color: activeFormats.bold ? "#fff" : "#1a1a1a",
            }}
            aria-label="Bold"
          >
            B
          </button>
          <button
            onClick={() => applyFormat("italic")}
            className="w-14 h-14 rounded-full flex items-center justify-center italic text-lg transition-transform active:scale-95"
            style={{
              backgroundColor: activeFormats.italic ? "#1a1a1a" : "#dcdde1",
              color: activeFormats.italic ? "#fff" : "#1a1a1a",
            }}
            aria-label="Italic"
          >
            I
          </button>
          <button
            onClick={() => applyFormat("underline")}
            className="w-14 h-14 rounded-full flex items-center justify-center underline text-lg transition-transform active:scale-95"
            style={{
              backgroundColor: activeFormats.underline ? "#1a1a1a" : "#dcdde1",
              color: activeFormats.underline ? "#fff" : "#1a1a1a",
            }}
            aria-label="Underline"
          >
            U
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium transition-transform active:scale-95"
                style={{
                  backgroundColor: t.swatch,
                  color: t.swatchTextColor,
                  boxShadow:
                    themeId === t.id
                      ? "0 0 0 3px #ffffff, 0 0 0 6px #7c5cfa"
                      : "none",
                }}
                aria-label={`${t.label} theme`}
                title={t.label}
              >
                T
              </button>
            ))}
          </div>

          <div className="w-3" />

          <button
            onClick={jumpToPage}
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-transform active:scale-95"
            style={{ backgroundColor: "#dcdde1", color: "#1a1a1a" }}
            aria-label="Jump to page"
          >
            #
          </button>
        </div>
      </div>

      {/*Book*/}
      <div
        className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-xl"
        style={{ minHeight: LINES_PER_PAGE * LINE_HEIGHT + 64 }}
      >
        {renderPage(leftPage, spreadIndex * 2 + 1)}
        <div style={{ width: 3, backgroundColor: "#000" }} />
        {renderPage(rightPage, spreadIndex * 2 + 2)}
      </div>

      {/*Page nav footer*/}
      <div
        className="flex items-center gap-4 mt-6 text-sm"
        style={{ color: "#4a4f5a" }}
      >
        <button
          disabled={spreadIndex === 0}
          onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
          className="px-3 py-1 rounded-full disabled:opacity-30"
          style={{ backgroundColor: "#dcdde1" }}
        >
          ← Prev
        </button>
        <span>
          Pages {spreadIndex * 2 + 1}–{spreadIndex * 2 + 2} of {pages.length}
        </span>
        {spreadIndex * 2 + 2 >= pages.length ? (
          <button
            onClick={addPagePair}
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: "#dcdde1" }}
          >
            + Add pages
          </button>
        ) : (
          <button
            onClick={() => setSpreadIndex((i) => i + 1)}
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: "#dcdde1" }}
          >
            Next →
          </button>
        )}
      </div>

      {/*Slide-out menu*/}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-72 h-full bg-white dark:bg-neutral-900 p-5 flex flex-col gap-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold tracking-wide text-neutral-400 mb-2">
              DOCUMENT
            </span>
            <div className="text-sm text-neutral-500 mb-4 truncate">
              {filePath || "Not saved yet"}
            </div>
            <button
              onClick={handleOpen}
              className="text-sm text-left px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Open file…
            </button>
            <button
              onClick={handleSave}
              className="text-sm text-left px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Save
            </button>
            <button
              onClick={addPagePair}
              className="text-sm text-left px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Add pages
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
