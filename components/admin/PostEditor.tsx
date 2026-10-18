"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deletePost, publishPost, savePost, unpublishPost } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import { dataUrlToFile, importDocument } from "./importDoc";
import { RichEditor } from "./RichEditor";
import { uploadImage } from "./uploadImage";

type ExistingPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt: string;
  seoTitle: string;
  bodyHtml: string;
  published: boolean;
  sentAt: string | null;
  sentCount: number;
};

export function PostEditor({ post, subscriberCount }: { post?: ExistingPost; subscriberCount: number }) {
  const router = useRouter();
  const [id, setId] = useState(post?.id);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? null);
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [bodyHtml, setBodyHtml] = useState(post?.bodyHtml ?? "");
  // Bumped to push imported HTML into the editor.
  const [replaceBody, setReplaceBody] = useState<{ html: string; n: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sendEmail, setSendEmail] = useState(!post?.sentAt);
  const [coverUploading, setCoverUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const published = post?.published ?? false;
  const alreadySent = !!post?.sentAt;

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  async function save(): Promise<string | null> {
    const res = await savePost({ id, title, slug, excerpt, coverImage, coverAlt, seoTitle, bodyHtml });
    if (!res.ok) {
      setStatus(res.error);
      return null;
    }
    setSlug(res.slug);
    setDirty(false);
    if (!id) {
      setId(res.id);
      router.replace(`/admin/posts/${res.id}`);
    }
    return res.id;
  }

  function onSave() {
    startTransition(async () => {
      setStatus("");
      if (await save()) {
        setStatus("Saved.");
        router.refresh();
      }
    });
  }

  function onPublish() {
    startTransition(async () => {
      setStatus("");
      const savedId = await save();
      if (!savedId) return;
      const res = await publishPost(savedId, sendEmail && !alreadySent);
      setConfirming(false);
      if (!res.ok) setStatus(res.error);
      else if (res.sent > 0) setStatus(`Published and emailed to ${res.sent} subscriber${res.sent === 1 ? "" : "s"}.`);
      else setStatus("Published.");
      router.refresh();
    });
  }

  function onUnpublish() {
    if (!id || !window.confirm("Take this post off the site? It stays here as a draft.")) return;
    startTransition(async () => {
      await unpublishPost(id);
      setStatus("Unpublished — it’s a draft again.");
      router.refresh();
    });
  }

  function onDelete() {
    if (!id || !window.confirm("Delete this post permanently?")) return;
    startTransition(async () => {
      await deletePost(id);
    });
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    try {
      touch(setCoverImage)(await uploadImage(file));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Cover upload failed.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const hasBody = bodyHtml.replace(/<[^>]+>/g, "").trim().length > 0;
    if (hasBody && !window.confirm(`Replace the current post with ${file.name}?`)) return;
    setImporting(true);
    setStatus("");
    try {
      const doc = await importDocument(file);
      setReplaceBody({ html: doc.html, n: Date.now() });
      // Fill only the fields that are still empty.
      if (doc.title && !title.trim()) {
        setTitle(doc.title);
        if (!slugTouched && !doc.slug) setSlug(slugify(doc.title));
      }
      if (doc.slug && !alreadySent && (!slugTouched || !slug)) {
        setSlug(slugify(doc.slug));
        setSlugTouched(true);
      }
      if (doc.summary && !excerpt.trim()) setExcerpt(doc.summary.slice(0, 400));
      if (doc.seoTitle && !seoTitle.trim()) setSeoTitle(doc.seoTitle.slice(0, 120));
      let coverNote = "";
      if (doc.cover && !coverImage) {
        try {
          setCoverImage(await importCover(doc.cover));
          if (doc.coverAlt && !coverAlt.trim()) setCoverAlt(doc.coverAlt.slice(0, 200));
          coverNote = " with its cover image";
        } catch {
          coverNote = ", but the cover image didn't upload (add it with Upload cover image)";
        }
      }
      setDirty(true);
      setStatus(`Imported ${file.name}${coverNote}. Check it over, then save.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  // A cover from an imported file: a data: image is uploaded, an https link copied.
  async function importCover(src: string): Promise<string> {
    if (src.startsWith("data:")) return uploadImage(dataUrlToFile(src, "cover"));
    const res = await fetch("/api/admin/import-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: src }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? "Cover didn't copy.");
    return json.url;
  }

  const searchTitle = (seoTitle.trim() || title.trim() || "Post title") + " — Apex Capital Consultants";
  const searchDesc = excerpt.trim() || "Add a summary: this is the description Google shows under your link.";

  return (
    <div className="post-editor">
      <div className="admin-head">
        <div>
          <Link href="/admin/posts" className="admin-back">&larr; All posts</Link>
          <h1>{post ? "Edit post" : "New post"}</h1>
          <p className="admin-sub">
            <span className={`pill ${published ? "pill-live" : ""}`}>{published ? "Published" : "Draft"}</span>
            {alreadySent && <> &middot; emailed to {post?.sentCount} on {new Date(post!.sentAt!).toLocaleDateString()}</>}
            {dirty && <> &middot; unsaved changes</>}
          </p>
        </div>
        <div className="editor-actions">
          {published && slug && (
            <a className="arrow-link" href={`/minutes/${slug}`} target="_blank" rel="noopener noreferrer">View live</a>
          )}
          <button type="button" className="btn-ghost" onClick={onSave} disabled={pending}>Save draft</button>
          <button type="button" className="btn-solid" onClick={() => setConfirming(true)} disabled={pending || !title.trim()}>
            {published ? "Update / send" : "Publish"}
          </button>
        </div>
      </div>

      {status && <p className="editor-status" role="status">{status}</p>}

      {confirming && (
        <div className="confirm-box" role="dialog" aria-label="Confirm publish">
          <p>
            {published ? "Save changes to the live post" : "Publish this post"} at <code>/minutes/{slugify(slug || title)}</code>.
          </p>
          {alreadySent ? (
            <p className="muted">It was already emailed, so it won&rsquo;t be sent again.</p>
          ) : (
            <label className="check">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email it to {subscriberCount} active subscriber{subscriberCount === 1 ? "" : "s"} now
            </label>
          )}
          <div className="editor-actions">
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={pending}>Cancel</button>
            <button type="button" className="btn-solid" onClick={onPublish} disabled={pending}>
              {pending ? "Working…" : sendEmail && !alreadySent && subscriberCount > 0 ? "Publish & send" : published ? "Save live post" : "Publish"}
            </button>
          </div>
        </div>
      )}

      <div className="editor-fields">
        <label className="field">
          <span>Title</span>
          <input
            className="title-input"
            value={title}
            maxLength={200}
            onChange={(e) => {
              touch(setTitle)(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="What this post is about"
          />
        </label>
        <label className="field">
          <span>URL</span>
          <div className="slug-row">
            <em>/minutes/</em>
            <input
              value={slug}
              maxLength={80}
              onChange={(e) => {
                setSlugTouched(true);
                touch(setSlug)(e.target.value);
              }}
              onBlur={() => setSlug(slugify(slug))}
              disabled={alreadySent}
              title={alreadySent ? "Locked: the emailed link points here." : undefined}
            />
          </div>
        </label>
        <label className="field">
          <span>
            Summary <small>shown on the Minutes page, in Google results, and in link previews &middot;{" "}
            <b className={excerpt.length > 160 ? "count-over" : excerpt.length >= 70 ? "count-ok" : ""}>{excerpt.length}/160</b></small>
          </span>
          <textarea value={excerpt} maxLength={400} rows={2} onChange={(e) => touch(setExcerpt)(e.target.value)} placeholder="One or two sentences on what the reader gets from this post." />
        </label>
        <details className="seo-box" open={!!seoTitle}>
          <summary>Search &amp; sharing</summary>
          <label className="field">
            <span>
              SEO title <small>optional; the headline Google shows. Blank uses the post title &middot;{" "}
              <b className={(seoTitle || title).length > 60 ? "count-over" : ""}>{(seoTitle || title).length}/60</b></small>
            </span>
            <input value={seoTitle} maxLength={120} onChange={(e) => touch(setSeoTitle)(e.target.value)} placeholder={title || "How to Get More Customers From Your Website"} />
          </label>
          <div className="serp" aria-label="Google preview">
            <p className="serp-url">acc-funds.com &rsaquo; minutes &rsaquo; {slugify(slug || title) || "post-url"}</p>
            <p className="serp-title">{searchTitle}</p>
            <p className="serp-desc">{searchDesc}</p>
          </div>
        </details>
        <div className="field">
          <span>Cover image</span>
          {coverImage ? (
            <>
              <div className="cover-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="" />
                <button type="button" className="btn-ghost" onClick={() => touch(setCoverImage)(null)}>Remove</button>
              </div>
              <input className="alt-input" value={coverAlt} maxLength={200} onChange={(e) => touch(setCoverAlt)(e.target.value)} placeholder="Describe the image for Google and screen readers (alt text)" />
            </>
          ) : (
            <label className="btn-ghost file-btn">
              {coverUploading ? "Uploading…" : "Upload cover image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onCover} disabled={coverUploading} />
            </label>
          )}
        </div>
        <div className="field">
          <span className="post-label-row">
            Post <small>Paste from Google Docs, Word, or a chat: headings, lists, links, and images come with it.</small>
            <label className="btn-ghost file-btn import-btn">
              {importing ? "Importing…" : "Import file"}
              <input type="file" accept=".docx,.md,.markdown,.txt,.html,.htm" hidden onChange={onImport} disabled={importing} />
            </label>
          </span>
          <RichEditor initialHtml={bodyHtml} onChange={touch(setBodyHtml)} replace={replaceBody} onStatus={setStatus} />
        </div>
      </div>

      {post && (
        <div className="editor-danger">
          {published && <button type="button" className="btn-ghost" onClick={onUnpublish} disabled={pending}>Unpublish</button>}
          {!alreadySent && <button type="button" className="btn-ghost danger" onClick={onDelete} disabled={pending}>Delete post</button>}
        </div>
      )}
    </div>
  );
}
