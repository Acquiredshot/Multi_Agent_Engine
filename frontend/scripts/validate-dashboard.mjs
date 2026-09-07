// One-off validation: run every unique dashboard expression through
// Grafana's /api/ds/query and report which panels have data.
// Usage: node scripts/validate-dashboard.mjs
import fs from "node:fs";

const DASH = process.argv[2] ?? "../monitoring/grafana/dashboards/multi-agent-engine.json";
const GRAFANA = process.argv[3] ?? "http://localhost:3000";
const AUTH = process.argv[4] ?? "admin:admin";

const dash = JSON.parse(fs.readFileSync(DASH, "utf8"));

const seen = new Map(); // expr -> refId
const queries = [];
for (const panel of dash.panels) {
  for (const t of panel.targets ?? []) {
    if (seen.has(t.expr)) continue;
    seen.set(t.expr, `Q${queries.length}`);
    queries.push({
      refId: `Q${queries.length}`,
      datasource: { type: "prometheus", uid: "prometheus" },
      expr: t.expr
        .replaceAll("$__rate_interval", "2m")
        .replaceAll("$__range", "30m")
        .replaceAll("$__interval", "1m"),
      maxDataPoints: 60,
      intervalMs: 5000,
    });
  }
}

const res = await fetch(`${GRAFANA}/api/ds/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(AUTH).toString("base64")}`,
  },
  body: JSON.stringify({ from: "now-30m", to: "now", queries }),
});

const body = await res.json();
let ok = 0;
let fail = 0;
for (const q of queries) {
  const fr = body.results?.[q.refId];
  const frames = fr?.frames ?? [];
  const pts = frames[0]?.data?.values?.[0]?.length ?? 0;
  if (fr && frames.length && !fr.error) {
    ok++;
    console.log(q.refId.padEnd(4), "OK ", String(pts).padStart(3) + "pts", "|", q.expr.slice(0, 88));
  } else {
    fail++;
    console.log(q.refId.padEnd(4), "FAIL", "|", q.expr.slice(0, 88), "|", fr?.error ?? "no frames");
  }
}
console.log("---");
console.log(`PASSED: ${ok} | FAILED: ${fail} | unique expressions: ${queries.length}`);
process.exit(fail > 0 ? 1 : 0);
