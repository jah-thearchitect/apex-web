import type { FileRef } from "@/lib/briefQuestions";
import { formatDate } from "@/lib/posts";

type Message = { id: string; from: "FIRM" | "CLIENT"; body: string; files: unknown; createdAt: Date };

/**
 * Follow-up messages on an update request, oldest first. `fileHref` turns
 * an uploaded file into a link (admin only); without it, names are plain text.
 */
export function RequestThread({
  messages, clientName, fileHref,
}: { messages: Message[]; clientName: string; fileHref?: (path: string) => string }) {
  if (messages.length === 0) return null;
  return (
    <ol className="thread">
      {messages.map((m) => {
        const files = (Array.isArray(m.files) ? m.files : []) as FileRef[];
        return (
          <li key={m.id} className={m.from === "FIRM" ? "from-firm" : "from-client"}>
            <p className="thread-meta">{m.from === "FIRM" ? "Apex" : clientName} &middot; {formatDate(m.createdAt)}</p>
            <p className="thread-body">{m.body}</p>
            {files.length > 0 && (
              <p className="thread-files">
                {files.map((f, i) => (
                  <span key={f.path}>
                    {i > 0 && " · "}
                    {fileHref ? <a href={fileHref(f.path)} target="_blank" rel="noopener">{f.name}</a> : f.name}
                  </span>
                ))}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
