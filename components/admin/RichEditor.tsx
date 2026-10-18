"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { dataUrlToFile, looksLikeMarkdown, markdownToHtml, normalizeHtml } from "./importDoc";
import { uploadImage } from "./uploadImage";

const OURS = "/media/minutes/";

export function RichEditor({
  initialHtml, onChange, replace, onStatus,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  /** New HTML to load (e.g. an imported file); `n` changes each time. */
  replace?: { html: string; n: number } | null;
  onStatus?: (message: string) => void;
}) {
  const editorRef = useRef<Editor | null>(null);
  const status = (m: string) => onStatus?.(m);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"] },
      }),
      // Pasted images may arrive as data: URLs; they're kept just long
      // enough to be uploaded (rehostImages), and never saved as-is.
      Image.configure({ allowBase64: true }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: "prose rich-editor-body", "aria-label": "Post body" },
      transformPastedHTML: normalizeHtml,
      handlePaste: (_view, event) => {
        const ed = editorRef.current;
        if (!ed) return false;
        const files = imageFiles(event.clipboardData?.files);
        if (files.length) {
          void insertImages(ed, files, status);
          return true;
        }
        const html = event.clipboardData?.getData("text/html") ?? "";
        const text = event.clipboardData?.getData("text/plain") ?? "";
        // Copied as Markdown (from a chat or a .md file): turn it into formatting.
        if (!html && text && looksLikeMarkdown(text)) {
          ed.chain().focus().insertContent(normalizeHtml(markdownToHtml(text))).run();
          return true;
        }
        // Let the editor paste, then bring any outside images in-house.
        setTimeout(() => void rehostImages(ed, status), 0);
        return false;
      },
      handleDrop: (view, event) => {
        const ed = editorRef.current;
        const files = imageFiles(event.dataTransfer?.files);
        if (!ed || !files.length) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        if (pos !== undefined) ed.commands.setTextSelection(pos);
        void insertImages(ed, files, status);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  editorRef.current = editor;

  // Load imported content.
  useEffect(() => {
    if (!editor || !replace) return;
    editor.commands.setContent(replace.html, { emitUpdate: true });
    void rehostImages(editor, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, replace?.n]);

  return (
    <div className="rich-editor">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function imageFiles(list: FileList | null | undefined) {
  return Array.from(list ?? []).filter((f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
}

async function insertImages(editor: Editor, files: File[], status: (m: string) => void) {
  status(`Uploading ${files.length} image${files.length === 1 ? "" : "s"}…`);
  for (const file of files) {
    try {
      const src = await uploadImage(file);
      editor.chain().focus().setImage({ src, alt: "" }).run();
    } catch (err) {
      status(err instanceof Error ? err.message : "An image didn't upload.");
      return;
    }
  }
  status("Images added. Click one and add alt text with the Image button if needed.");
}

/**
 * Uploads every image in the post that isn't stored on the site yet (pasted
 * data: images, or links to Google Docs/other hosts) and points it at the
 * copy. Any that can't be copied are removed, since they'd vanish anyway.
 */
async function rehostImages(editor: Editor, status: (m: string) => void) {
  const foreign = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image" && typeof node.attrs.src === "string" && !node.attrs.src.startsWith(OURS)) foreign.add(node.attrs.src);
  });
  if (foreign.size === 0) return;
  status(`Copying ${foreign.size} image${foreign.size === 1 ? "" : "s"} into the post…`);

  let failed = 0;
  for (const src of foreign) {
    let next: string | null = null;
    try {
      if (src.startsWith("data:")) {
        next = await uploadImage(dataUrlToFile(src, "pasted"));
      } else if (src.startsWith("https://")) {
        const res = await fetch("/api/admin/import-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: src }),
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string };
        next = res.ok && json.url ? json.url : null;
      }
    } catch {
      next = null;
    }
    // Positions shift as we edit, so find this image again each time.
    const { tr } = editor.state;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "image" || node.attrs.src !== src) return;
      if (next) tr.setNodeMarkup(tr.mapping.map(pos), undefined, { ...node.attrs, src: next });
      else tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize));
    });
    if (!next) failed++;
    editor.view.dispatch(tr);
  }
  status(failed ? `${failed} image${failed === 1 ? "" : "s"} couldn't be copied and ${failed === 1 ? "was" : "were"} left out. Add ${failed === 1 ? "it" : "them"} with the Image button.` : "Images copied into the post.");
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
    }),
  });

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const alt = window.prompt("Describe the image for screen readers (optional)", "") ?? "";
      editor.chain().focus().setImage({ src: url, alt }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const btn = (label: string, active: boolean, run: () => void, title?: string) => (
    <button type="button" className={active ? "on" : ""} onClick={run} title={title ?? label} aria-pressed={active}>
      {label}
    </button>
  );

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
      {btn("H2", state.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Heading")}
      {btn("H3", state.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Subheading")}
      <span className="sep" />
      {btn("B", state.bold, () => editor.chain().focus().toggleBold().run(), "Bold")}
      {btn("I", state.italic, () => editor.chain().focus().toggleItalic().run(), "Italic")}
      {btn("U", state.underline, () => editor.chain().focus().toggleUnderline().run(), "Underline")}
      <span className="sep" />
      {btn("• List", state.bullet, () => editor.chain().focus().toggleBulletList().run(), "Bulleted list")}
      {btn("1. List", state.ordered, () => editor.chain().focus().toggleOrderedList().run(), "Numbered list")}
      {btn("Quote", state.quote, () => editor.chain().focus().toggleBlockquote().run())}
      {btn("Link", state.link, setLink)}
      {btn("Line", false, () => editor.chain().focus().setHorizontalRule().run(), "Divider line")}
      <span className="sep" />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : "Image"}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onPickImage} />
      <span className="sep" />
      {btn("Undo", false, () => editor.chain().focus().undo().run())}
      {btn("Redo", false, () => editor.chain().focus().redo().run())}
    </div>
  );
}
