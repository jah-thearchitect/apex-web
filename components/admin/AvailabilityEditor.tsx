"use client";

import { useState } from "react";

type Range = [string, string];
type Weekly = Record<string, Range[]>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmtDay = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * Weekly hours (any number of time windows per day) and a list of days off.
 * Posts both as JSON in hidden fields of the surrounding booking form.
 */
export function AvailabilityEditor({ weekly: initial, daysOff: initialOff, today }: { weekly: Weekly; daysOff: string[]; today: string }) {
  const [weekly, setWeekly] = useState<Weekly>(() => {
    const w: Weekly = {};
    for (let d = 0; d < 7; d++) w[d] = (initial[d] ?? []).map(([a, b]) => [a, b] as Range);
    return w;
  });
  const [daysOff, setDaysOff] = useState<string[]>(() => initialOff.filter((d) => d >= today).sort());
  const [newOff, setNewOff] = useState("");

  const setDay = (d: number, ranges: Range[]) => setWeekly((w) => ({ ...w, [d]: ranges }));
  const lastEnd = (d: number) => weekly[d].at(-1)?.[1];

  // A new window starts an hour after the day's last one ends.
  function addRange(d: number) {
    const end = lastEnd(d);
    if (!end) return setDay(d, [["10:00", "13:00"]]);
    const [h, m] = end.split(":").map(Number);
    const sh = Math.min(h + 1, 22);
    const pad = (n: number) => String(n).padStart(2, "0");
    setDay(d, [...weekly[d], [`${pad(sh)}:${pad(m)}`, `${pad(Math.min(sh + 2, 23))}:${pad(m)}`]]);
  }

  return (
    <>
      <input type="hidden" name="weeklyHours" value={JSON.stringify(weekly)} />
      <input type="hidden" name="daysOff" value={JSON.stringify(daysOff)} />

      <div className="field">
        <span>Weekly hours <small>add a second window for split days, like 10&ndash;12 and 3&ndash;5</small></span>
        <div className="hours-grid">
          {DAYS.map((name, d) => {
            const ranges = weekly[d];
            const on = ranges.length > 0;
            return (
              <div className="avail-row" key={d}>
                <label className="check avail-day">
                  <input type="checkbox" checked={on} onChange={(e) => setDay(d, e.target.checked ? [["10:00", "13:30"]] : [])} /> {name}
                </label>
                <div className="avail-ranges">
                  {!on && <span className="avail-off">Unavailable</span>}
                  {ranges.map(([a, b], i) => (
                    <div className="avail-range" key={i}>
                      <input type="time" value={a} aria-label={`${name} window ${i + 1} start`}
                        onChange={(e) => setDay(d, ranges.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
                      <span>to</span>
                      <input type="time" value={b} aria-label={`${name} window ${i + 1} end`}
                        onChange={(e) => setDay(d, ranges.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                      {a >= b && <em className="avail-warn">ends before it starts</em>}
                      <button type="button" className="line-remove" aria-label={`Remove ${name} window ${i + 1}`}
                        onClick={() => setDay(d, ranges.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                  {on && <button type="button" className="bk-link" onClick={() => addRange(d)}>+ Add hours</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="field">
        <span>Days off <small>no bookings on these dates (vacations, holidays, busy days)</small></span>
        <div className="days-off">
          <div className="avail-range">
            <input type="date" min={today} value={newOff} onChange={(e) => setNewOff(e.target.value)} aria-label="Day off" />
            <button
              type="button" className="btn-ghost" disabled={!newOff}
              onClick={() => {
                if (newOff && !daysOff.includes(newOff)) setDaysOff([...daysOff, newOff].sort());
                setNewOff("");
              }}
            >Add day off</button>
          </div>
          {daysOff.length === 0 ? (
            <p className="avail-off">No days off scheduled.</p>
          ) : (
            <ul className="off-list">
              {daysOff.map((d) => (
                <li key={d}>
                  {fmtDay(d)}
                  <button type="button" className="line-remove" aria-label={`Remove ${d}`} onClick={() => setDaysOff(daysOff.filter((x) => x !== d))}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
