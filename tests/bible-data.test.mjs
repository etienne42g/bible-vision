import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readBible(name) {
  return JSON.parse(
    await readFile(new URL(`../public/bibles/${name}.json`, import.meta.url), "utf8"),
  );
}

test("preserves word boundaries around poetry and source notes", async () => {
  const [lsg, darby] = await Promise.all([readBible("lsg"), readBible("darby")]);
  const lsgGenesis423 = lsg.books.GEN[3][22];
  const lsgPsalm231 = lsg.books.PSA[22][0];
  const darbyGenesis47 = darby.books.GEN[3][6];

  assert.match(lsgGenesis423, /femmes: Ada et Tsilla/u);
  assert.match(lsgGenesis423, /voix! Femmes de Lémec/u);
  assert.match(lsgPsalm231, /David\. L’Éternel/u);
  assert.match(darbyGenesis47, /péché est couché/u);
});
