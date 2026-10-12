"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deletePost, publishPost, savePost, unpublishPost } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import { RichEditor } from "./RichEditor";
import { uploadImage } from "./uploadImage";

type ExistingPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
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
  const [bodyHtml, setBodyHtml] = useState(post?.bodyHtml ?? "");
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
    const res = await savePost({ id, title, slug, excerpt, coverImage, bodyHtml });
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
          <span>Summary <small>shown on the Minutes page and in link previews</small></span>
          <textarea value={excerpt} maxLength={400} rows={2} onChange={(e) => touch(setExcerpt)(e.target.value)} />
        </label>
        <div className="field">
          <span>Cover image</span>
          {coverImage ? (
            <div className="cover-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="" />
              <button type="button" className="btn-ghost" onClick={() => touch(setCoverImage)(null)}>Remove</button>
            </div>
          ) : (
            <label className="btn-ghost file-btn">
              {coverUploading ? "Uploading…" : "Upload cover image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onCover} disabled={coverUploading} />
            </label>
          )}
        </div>
        <div className="field">
          <span>Post</span>
          <RichEditor initialHtml={bodyHtml} onChange={touch(setBodyHtml)} />
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
