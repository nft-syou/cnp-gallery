import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { parse } from "csv-parse/sync";
import { rowToToken, isRevealed, type TokenRow } from "../src/lib/csv";

const CSV_PATH = process.env.CSV_PATH ??
  "\\\\wsl.localhost\\Ubuntu\\home\\user\\git\\cnp-metadata\\csv\\output.csv";
const OUT = "migrations/seed.sql";
const COLS = ["token_id","name","description","image_url","character","clan","ninjutsu","weapon_back","weapon_front","cosplay","acc_body","acc_head","acc_face","mokuton","katon","doton","kinton","suiton"] as const;

function esc(v: string | number): string {
  if (typeof v === "number") return String(v);
  return "'" + v.replace(/'/g, "''") + "'";
}

const text = readFileSync(CSV_PATH, "utf8");
const records: string[][] = parse(text, { relax_column_count: true });
const header = records[0];
const tokens: TokenRow[] = records.slice(1).map((r) => rowToToken(header, r)).filter(isRevealed);
console.log(`revealed tokens: ${tokens.length}`); // expect 22222

const lines: string[] = ["DELETE FROM tokens;"];
const BATCH = 50;
for (let i = 0; i < tokens.length; i += BATCH) {
  const chunk = tokens.slice(i, i + BATCH);
  const values = chunk.map((t) =>
    "(" + COLS.map((c) => esc((t as Record<string, string | number>)[c])).join(",") + ")"
  ).join(",\n");
  lines.push(`INSERT INTO tokens (${COLS.join(",")}) VALUES\n${values};`);
}
writeFileSync(OUT, lines.join("\n"));
console.log(`wrote ${OUT}`);
execSync(`npx wrangler d1 execute cnp-gallery --local --file ./${OUT}`, { stdio: "inherit" });
