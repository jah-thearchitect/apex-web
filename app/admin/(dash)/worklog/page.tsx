import Link from "next/link";
import { CopyButton } from "@/components/admin/CopyButton";
import { WorkLogForm } from "@/components/admin/WorkLogForm";
import { prisma } from "@/lib/prisma";
import { currentMonth, shiftMonth, todayYmd } from "@/lib/workLog";
import { isMonth, minutesLabel, monthBounds, monthLabel, shortDate, WORK_CATEGORIES, ymdOf } from "@/lib/workLogShared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work log" };

export default async function WorkLogPage({ searchParams }: { searchParams: Promise<{ client?: string; month?: string }> }) {
  const q = await searchParams;
  const month = isMonth(q.month) ? q.month : currentMonth();
  const { from, to } = monthBounds(month);

  const clients = await prisma.client.findMany({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true } });
  const clientId = clients.some((c) => c.id === q.client) ? q.client! : "";

  const [entries, projectRows] = await Promise.all([
    prisma.workLog.findMany({
      where: { workDate: { gte: from, lte: to }, ...(clientId ? { clientId } : {}) },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { businessName: true } } },
    }),
    prisma.workLog.findMany({ where: { project: { not: null } }, distinct: ["clientId", "project"], select: { clientId: true, project: true } }),
  ]);
  const projects: Record<string, string[]> = {};
  for (const r of projectRows) (projects[r.clientId] ??= []).push(r.project!);

  const base = (over: { client?: string; month?: string }) => {
    const p = new URLSearchParams();
    const c = over.client ?? clientId;
    if (c) p.set("client", c);
    p.set("month", over.month ?? month);
    return `/admin/worklog?${p}`;
  };

  // Totals per client for the month (time is for the owner's records only).
  const byClient = new Map<string, { name: string; minutes: number; count: number }>();
  for (const e of entries) {
    const row = byClient.get(e.clientId) ?? { name: e.client.businessName, minutes: 0, count: 0 };
    row.minutes += e.minutes ?? 0;
    row.count += 1;
    byClient.set(e.clientId, row);
  }
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes ?? 0), 0);

  // Plain-text version of the month, grouped by client, to paste into a report.
  const text = [...byClient].map(([id, row]) => {
    const lines = entries
      .filter((e) => e.clientId === id)
      .slice()
      .reverse()
      .map((e) => `${shortDate(ymdOf(e.workDate))} · ${e.category} · ${e.title}${e.details ? `\n   ${e.details.replace(/\n+/g, "\n   ")}` : ""}${e.minutes ? ` (${minutesLabel(e.minutes)})` : ""}`);
    return `${row.name} — ${monthLabel(month)}${row.minutes ? ` (${minutesLabel(row.minutes)} total)` : ""}\n${lines.join("\n")}`;
  }).join("\n\n");

  const exportQs = new URLSearchParams({ month, ...(clientId ? { client: clientId } : {}) });
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">INTERNAL</p>
          <h1>Work log</h1>
          <p className="admin-sub">Log what you do for each client as you go. At month end, filter to a client and copy or export it for their report.</p>
        </div>
      </div>

      <section className="overview-card" style={{ marginBottom: 40 }}>
        <h2 className="admin-h2">Log work</h2>
        {clients.length === 0 ? (
          <p className="admin-empty">Add a client first, then you can log work against them.</p>
        ) : (
          <WorkLogForm
            clients={clients.map((c) => ({ id: c.id, name: c.businessName }))}
            projects={projects}
            initial={{
              clientId, date: todayYmd(), project: "", category: WORK_CATEGORIES[0], title: "", details: "", hours: "", mins: "", visible: true,
            }}
          />
        )}
      </section>

      <div className="admin-head" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="admin-h2" style={{ margin: 0 }}>{monthLabel(month)}</h2>
          <p className="admin-sub tab-row">
            <Link href={base({ month: prev })}>&larr; {monthLabel(prev)}</Link>
            {month !== currentMonth() && <Link href={base({ month: currentMonth() })}>This month</Link>}
            {month < currentMonth() && <Link href={base({ month: next })}>{monthLabel(next)} &rarr;</Link>}
          </p>
        </div>
        <div className="editor-actions">
          <form action="/admin/worklog" method="get" style={{ display: "contents" }}>
            <input type="hidden" name="month" value={month} />
            <select name="client" defaultValue={clientId} className="slot" style={{ padding: ".75em 1em" }} aria-label="Filter by client">
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
            <button type="submit" className="btn-ghost">Filter</button>
          </form>
          {entries.length > 0 && (
            <>
              <CopyButton text={text} label="Copy as text" />
              <a className="btn-ghost" href={`/api/admin/worklog?${exportQs}`}>Download CSV</a>
            </>
          )}
        </div>
      </div>

      {byClient.size > 0 && (
        <div className="stat-row">
          {[...byClient].map(([id, row]) => (
            <div className="stat" key={id}>
              <span>{row.name}</span>
              <strong>{row.minutes ? minutesLabel(row.minutes) : `${row.count} ${row.count === 1 ? "entry" : "entries"}`}</strong>
              <small>{row.minutes ? `${row.count} ${row.count === 1 ? "entry" : "entries"}` : "no time logged"}</small>
            </div>
          ))}
          {byClient.size > 1 && (
            <div className="stat"><span>All clients</span><strong>{minutesLabel(totalMinutes) || `${entries.length} entries`}</strong><small>{entries.length} entries</small></div>
          )}
        </div>
      )}

      {entries.length === 0 ? <p className="admin-empty">Nothing logged for {monthLabel(month)}{clientId ? " for this client" : ""} yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Work</th><th className="keep">Time</th><th className="keep" /></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }}>{shortDate(ymdOf(e.workDate))}</td>
                <td style={{ maxWidth: 560 }}>
                  <strong style={{ color: "var(--on-ink)", fontWeight: 500 }}>{e.title}</strong>
                  <br />
                  <small>
                    {e.client.businessName} &middot; {e.category}{e.project ? ` · ${e.project}` : ""}
                    {!e.visible && <> &middot; <span className="pill">Internal only</span></>}
                    {e.requestId && <> &middot; from update request</>}
                  </small>
                  {e.details && <><br /><small style={{ whiteSpace: "pre-wrap" }}>{e.details}</small></>}
                </td>
                <td className="keep" style={{ whiteSpace: "nowrap" }}>{minutesLabel(e.minutes) || <small>no time</small>}</td>
                <td className="keep" style={{ textAlign: "right" }}><Link className="btn-ghost" href={`/admin/worklog/${e.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
