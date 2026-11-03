import { createElement, Fragment, type ReactNode } from "react";

// Conversor mínimo para os textos legais: #, ##, ###, parágrafos, listas "- ", **negrito** e [links](url).
// Gera elementos React (o texto é sempre escapado pelo React; nada de HTML cru).

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

function safeHref(url: string): string | null {
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^\/(?![\/\\])/.test(url) || url.startsWith("#")) return url;
  return null;
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = out.length;
    if (m[1] !== undefined) {
      out.push(createElement("strong", { key }, ...inline(m[1])));
    } else {
      const href = safeHref(m[3]);
      out.push(href === null ? m[2] : createElement("a", { key, href }, m[2]));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(source: string): ReactNode {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push(createElement("p", { key: blocks.length }, ...inline(paragraph.join(" "))));
    if (list.length) {
      blocks.push(createElement("ul", { key: blocks.length }, ...list.map((item, i) => createElement("li", { key: i }, ...inline(item)))));
    }
    paragraph = [];
    list = [];
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (!line) {
      flush();
    } else if (heading) {
      flush();
      blocks.push(createElement(`h${heading[1].length}`, { key: blocks.length }, ...inline(heading[2])));
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return createElement(Fragment, null, ...blocks);
}
