# Guias de animais mais completos — design

## Objetivo
Cada um dos 6 animais (galinha, porco, vaca, ovelha, cabra, pato) ganha 4 assuntos novos, nos 3 idiomas (pt, en, es), com fontes reais conferidas:

1. **Habitat e proteção** — números-chave (espaço no abrigo, área externa, ninho/cocho, poleiro/bebedouro) + dicas de montagem (cama, ventilação, piso, sombra, água, local).
2. **Predadores** (na mesma aba do habitat) — quem ataca e o sinal deixado; como proteger (cerca, tela, fechar à noite, animais guardiões).
3. **Reprodução** — números-chave (idade para reproduzir, cio/intervalo, gestação/incubação, filhotes por parto ou ovos por ano, desmame, vida produtiva) + cuidados por fase.
4. **Manejo e bem-estar** — rotina diária, semanal e mensal; o que deixa o animal feliz; sinais de estresse ou doença; como manusear.

## Dados (`content/animals/<id>.json`, validado por `animalContentSchema`)
```
habitat:      { facts: [{ label: Text, value: Text }] (min 3), tips: Text[] (min 4) }
predators:    { threats: [{ name: Text, signs: Text }] (min 3), protection: Text[] (min 3) }
reproduction: { facts: [{ label: Text, value: Text }] (min 4), tips: Text[] (min 4) }
welfare:      { daily: Text[], weekly: Text[], monthly: Text[] (min 2 cada),
                happy: Text[] (min 3), stressSigns: Text[] (min 3), handling: Text[] (min 2) }
```
As fontes novas entram na lista `sources` que o animal já tem. Os campos ficam opcionais enquanto o conteúdo é escrito e passam a obrigatórios quando os 6 estiverem prontos.

## Página `/animals/[id]`
Uma fileira só de abas, por endereço (`?tab=`), no estilo das abas de Perfil e MyFarm:
`Visão geral · Habitat e proteção · Alimentação · Saúde · Reprodução · Bem-estar e manejo · Diário`
- Visão geral: resumo, No seu país, raças, temperatura ideal, cuidados da estação (como hoje).
- Saúde: cuidados de saúde + doenças (como hoje).
- Diário continua em `?tab=diary` (links antigos `?aba=diario` seguem valendo).
- Fontes no fim de cada aba de conteúdo. Painel não muda.

## Verificação
- Teste de schema: aceita ficha completa, recusa assunto novo incompleto.
- Teste de conteúdo: todos os JSON passam no schema (já existe).
- E2E: as abas abrem e mostram cada assunto.
- Números conferidos em fonte aberta; os da galinha são mostrados ao dono antes dos outros 5.

## Ordem
1. Schema + página com abas + galinha completa → revisão do dono.
2. Porco, vaca, ovelha, cabra, pato → campos obrigatórios → testes → publicar só com autorização.
