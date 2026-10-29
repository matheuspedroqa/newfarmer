# Base de conhecimento do NewFarmer

Material de pesquisa por país usado para escrever o "melhor manual" de cada animal e plantação (`content/`).
Países: BR (Brasil), US (EUA), CA (Canadá), DE (Alemanha), ES (Espanha), FR (França), PT (Portugal), IT (Itália), MX (México).

## Estrutura

```
knowledge/<PAÍS>/animals/<id>.md     notas de pesquisa (português)
knowledge/<PAÍS>/animals/<id>.json   resumo estruturado para o bloco "No seu país"
knowledge/<PAÍS>/crops/<id>.md
knowledge/<PAÍS>/crops/<id>.json
```

IDs dos animais: chickens (galinhas), pigs (porcos), cows (vacas), sheep (ovelhas), goats (cabras), ducks (patos).
IDs das plantações: lettuce (alface), tomato (tomate), kale (couve), carrot (cenoura), onion (cebola), corn (milho), beans (feijão), rice (arroz), wheat (trigo), soy (soja), banana, orange (laranja), passionFruit (maracujá), strawberry (morango), papaya (mamão), cassava (mandioca), potato (batata), sweetPotato (batata-doce), parsley (salsinha), basil (manjericão).

## Regras de pesquisa

- **Fontes reais e verificadas.** Só cite páginas que você encontrou com WebSearch/WebFetch nesta pesquisa. Nunca invente URL. Prefira fontes oficiais e técnicas do próprio país (lista abaixo), no idioma local.
- **Sem doses de remédio.** Remédios veterinários só pelo tipo/princípio ativo e pela regra local (ex.: "na UE antibiótico exige receita veterinária").
- **Foque no diferencial do país**: o que muda em relação a um manual genérico (raças/variedades típicas, clima e épocas locais, leis e registros obrigatórios, vacinas obrigatórias, doenças de notificação, programas oficiais, costumes de manejo, pragas locais).
- Se não achar algo, escreva "não encontrado" — não preencha com chute.

### Fontes sugeridas por país

| País | Fontes |
|---|---|
| BR | Embrapa, MAPA, Emater/extensão estadual, universidades (UFV, ESALQ, UFRGS) |
| US | USDA (APHIS, NRCS), extensão das universidades land-grant (ex.: extension.umn.edu, extension.psu.edu, ucanr.edu, extension.oregonstate.edu) |
| CA | Agriculture and Agri-Food Canada, CFIA, governos provinciais (OMAFRA/Ontario, Alberta Agriculture), universidades (Guelph, UBC) |
| DE | BLE/BZL (praxis-agrar.de, landwirtschaft.de), FLI, Landwirtschaftskammern, LfL Bayern, KTBL |
| ES | MAPA (mapa.gob.es), institutos agrários regionais (IRTA, IFAPA, ITACyL), universidades |
| FR | Chambres d'agriculture, Institut de l'Élevage (idele.fr), ITAVI, INRAE, ministère de l'Agriculture, gnis/semae |
| PT | DGAV, INIAV, DRAP (direções regionais de agricultura), Agroportal, universidades (ISA Lisboa, UTAD) |
| IT | Ministero della Salute (veterinaria), CREA, IZS (Istituti Zooprofilattici), Regioni, università |
| MX | SADER, SENASICA, INIFAP, universidades (UNAM, Chapingo) |

## Formato do `<id>.md` (português, 300–700 palavras)

```markdown
# <Nome do item> — <País>

## Contexto local
Clima/regiões onde se cria/cultiva, importância no país.

## Raças ou variedades típicas
## Épocas e calendário local
(animais: manejo por estação; plantações: meses de plantio direto, sementeira, transplante e colheita por região, dizendo o hemisfério e o tipo de clima)
## Alimentação / adubação e cuidados
## Saúde e pragas (doenças, sinais, controle; regras de medicamentos)
## Leis, registros e programas oficiais
## Diferenciais deste país (o que o melhor manual deve aproveitar)

## Fontes
- [Título](URL) — o que foi tirado daqui
```

## Formato do `<id>.json`

Animais:
```json
{
  "country": "PT",
  "id": "chickens",
  "highlights": [
    { "pt": "Frase curta e prática sobre o diferencial do país.", "en": "Same in English." }
  ],
  "breeds": ["Pedrês Portuguesa", "Preta Lusitânica"],
  "sources": [{ "title": "DGAV — ...", "url": "https://..." }]
}
```

Plantações (acrescentar o calendário local, meses de 1 a 12 no calendário do próprio país):
```json
{
  "country": "PT",
  "id": "tomato",
  "highlights": [{ "pt": "...", "en": "..." }],
  "varieties": ["Coração de Boi"],
  "localCalendar": {
    "region": "Litoral centro (Lisboa)",
    "hemisphere": "north",
    "climate": "subtropical",
    "directSowing": [],
    "seedbed": [2, 3],
    "transplant": [4, 5],
    "harvest": [7, 8, 9]
  },
  "sources": [{ "title": "...", "url": "https://..." }]
}
```

- `highlights`: 3 a 5 frases curtas, práticas, em PT e EN, sobre o que é específico do país (é o que aparece no bloco "No seu país").
- `climate`: um de `tropical`, `subtropical`, `temperate`, `semiarid`, `cold`.
- `sources`: no mínimo 2, todas reais.
