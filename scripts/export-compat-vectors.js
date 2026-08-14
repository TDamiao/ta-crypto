import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCompatPayload } from "./compat-payload.js";

const payload = buildCompatPayload();
const out = resolve(process.cwd(), "test/fixtures/compat-current.json");
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${out} with ${payload.meta.scenarios.length} deterministic market scenarios`);
