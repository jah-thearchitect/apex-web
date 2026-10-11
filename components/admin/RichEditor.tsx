"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { uploadImage } from "./uploadImage";

export function RichEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"] },
      }),
      Image,
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "prose rich-editor-body", "aria-label": "Post body" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rich-editor">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
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
