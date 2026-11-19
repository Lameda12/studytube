// Step 1: mine HN for YouTube videos that several different people recommend.
// Source: public ClickHouse playground (full HN dump, items to Aug 2023, no key needed).
// Counts distinct HN users who linked a video in a comment or submitted it as a story.
// Output: data/mined.json  [{ id, recs, mentions, first, last }]
import { readFile, writeFile } from "node:fs/promises";

const MIN_RECS = Number(process.argv[2] ?? 3);
const sql = (await readFile(new URL("./mine.sql", import.meta.url), "utf8")).replace("recs >= 2", `recs >= ${MIN_RECS}`);
const r = await fetch("https://play.clickhouse.com/?user=play&default_format=JSONEachRow", { method: "POST", body: sql });
if (!r.ok) throw new Error(`ClickHouse ${r.status}: ${(await r.text()).slice(0, 300)}`);
const rows = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
const out = rows.map((x) => ({ id: x.vid, recs: +x.recs, mentions: +x.mentions, first: +x.first_year, last: +x.last_year }));
await writeFile(new URL("../data/mined.json", import.meta.url), JSON.stringify(out));
console.log(`mined ${out.length} videos with >= ${MIN_RECS} recommenders; top:`, out.slice(0, 3));
