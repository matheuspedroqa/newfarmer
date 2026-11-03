import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
}

it("nenhuma consulta monta SQL com ${} (use $1, $2…)", () => {
  const offenders = files("src").flatMap((f) => {
    const text = fs.readFileSync(f, "utf8");
    // db.query(`...${x}...`) ou db.run(`...${x}...`)
    return [...text.matchAll(/\.(query|run|exec)(<[^>]*>)?\(\s*`[^`]*\$\{/g)].map(() => f);
  });
  expect(offenders).toEqual([]);
});
