# Como escrever a ficha de uma planta (versão simples)

Cada planta vira `content/crops/<id>.json`, validado por `cropContentSchema` em `src/lib/content-schema.ts`.
O usuário pediu fichas **simples**: épocas de plantio conforme o clima, cuidados básicos e adubação.

```json
{
  "id": "tomato",
  "summary": { "pt": "1–2 frases: o que é e por que vale a pena plantar.", "en": "..." },
  "calendar": {
    "tropical":    { "directSowing": [], "seedbed": [3, 4], "transplant": [4, 5], "harvest": [7, 8, 9] },
    "subtropical": { "directSowing": [], "seedbed": [8, 9], "transplant": [9, 10], "harvest": [12, 1, 2] },
    "temperate":   { "directSowing": [], "seedbed": [8], "transplant": [10, 11], "harvest": [1, 2, 3] },
    "semiarid":    { "directSowing": [], "seedbed": [3, 4], "transplant": [4, 5], "harvest": [7, 8], "notes": { "pt": "Com irrigação.", "en": "With irrigation." } },
    "cold":        { "directSowing": [], "seedbed": [], "transplant": [], "harvest": [], "notes": { "pt": "Só em estufa.", "en": "Greenhouse only." } }
  },
  "care": {
    "fertilizing": { "pt": "Tipo de adubação: orgânica (esterco curtido, composto), NPK, calcário, quando aplicar.", "en": "..." },
    "pruning": { "pt": "Como podar/desbrotar.", "en": "..." },
    "watering": { "pt": "Rega/irrigação básica.", "en": "..." },
    "other": { "pt": "1–2 cuidados básicos (sol, espaçamento, tutor, principal praga).", "en": "..." }
  },
  "sources": [
    { "title": "Embrapa — ...", "url": "https://..." },
    { "title": "University extension — ...", "url": "https://..." }
  ]
}
```

Regras:

- **Meses 1–12 sempre na referência do HEMISFÉRIO SUL.** O app inverte sozinho para o hemisfério norte. Se a fonte for do hemisfério norte (EUA, Europa), converta o mês `m` para `((m + 5) % 12) + 1` antes de gravar (ex.: abril no norte = outubro no sul).
- Os 5 climas: `tropical` (quente o ano todo), `subtropical` (verão quente, inverno ameno), `temperate` (inverno frio com geada), `semiarid` (seco, chuva curta), `cold` (inverno longo e rigoroso).
- Plantas perenes ou árvores (frutíferas, café, cacau, aspargo, alcachofra, ervas perenes): o mês de plantar mudas vai em `transplant`; a safra em `harvest`.
- Se não se planta naquele clima, deixe as 4 listas vazias e explique em `notes` (ex.: "Não tolera geada; só em estufa").
- `pruning`: `null` se não se poda.
- Textos curtos e práticos, para leigos, em PT e EN.
- `sources`: mínimo 2 fontes REAIS encontradas com WebSearch/WebFetch nesta pesquisa (Embrapa, extensão universitária, FAO, institutos agrícolas da Europa). Nunca invente URL. Se `knowledge/*/crops/<id>.json` existir, pode usar as fontes de lá.
- Sem `countryNotes` (só os animais têm).
- Não escreva fora de `content/crops/`.

Para validar uma ficha: `npx vitest run tests/unit/content.test.ts -t "<id>"`.
