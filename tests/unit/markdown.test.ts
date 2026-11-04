import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

const html = (md: string) => renderToStaticMarkup(renderMarkdown(md));

describe("renderMarkdown", () => {
  it("títulos #, ## e ###", () => {
    expect(html("# Um\n\n## Dois\n\n### Três")).toBe("<h1>Um</h1><h2>Dois</h2><h3>Três</h3>");
  });

  it("parágrafos separados por linha em branco; linhas seguidas viram um só", () => {
    expect(html("primeira\nlinha\n\nsegunda")).toBe("<p>primeira linha</p><p>segunda</p>");
  });

  it("listas com - ", () => {
    expect(html("- a\n- b **c**")).toBe("<ul><li>a</li><li>b <strong>c</strong></li></ul>");
  });

  it("negrito e links http(s), mailto e relativos", () => {
    expect(html("**x** [site](https://a.com) [mail](mailto:a@b.com) [termos](/terms)")).toBe(
      '<p><strong>x</strong> <a href="https://a.com">site</a> <a href="mailto:a@b.com">mail</a> <a href="/terms">termos</a></p>',
    );
  });

  it("link com esquema perigoso vira só texto", () => {
    expect(html("[clique](javascript:alert(1))")).toBe("<p>clique</p>");
  });

  it("link que começa com barra invertida ou // vira só texto (o navegador trataria como outro site)", () => {
    expect(html("[a](/\\evil.com) [b](//evil.com)")).toBe("<p>a b</p>");
  });

  it("<script> aparece como texto, nunca como tag", () => {
    expect(html("<script>alert(1)</script>")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});
