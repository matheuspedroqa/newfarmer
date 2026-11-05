# Política de Privacidade

**Última atualização: 5 de novembro de 2026**

Esta política explica, em palavras simples, quais dados o NewFarmer guarda sobre você, para que usa, com quem divide e quais são os seus direitos. Ela vale para quem usa o site no Brasil, na União Europeia, nos Estados Unidos ou em qualquer outro lugar.

## 1. Quem cuida dos seus dados

O responsável pelos seus dados (o "controlador") é **Matheus Lemes**, com sede em Jundiaí, São Paulo, Brasil.

Para qualquer assunto de privacidade, fale com o encarregado (DPO) pelo e-mail [contact@newfarmer.app](mailto:contact@newfarmer.app).

## 2. Quais dados guardamos

Guardamos só o que o site precisa para funcionar. Não pedimos documentos, telefone nem endereço da propriedade. O número do cartão não passa por nós: quem recebe é o Stripe (veja o item 4).

### Dados da sua conta

- nome, username e e-mail;
- senha: nunca guardamos a senha em si, só uma versão embaralhada (hash bcrypt) que não pode ser desfeita;
- idioma e tema (claro ou escuro) que você escolheu;
- a data em que a conta foi criada e a data em que você confirmou o e-mail;
- se a conta é a do dono do site;
- se você aceitou receber e-mails de novidades, e o código do link de descadastro.

### Dados da assinatura

- o identificador de cliente e o da assinatura no Stripe, o status, a moeda, o valor e as datas da assinatura.

O número do cartão **nunca** chega ao NewFarmer e não é guardado por nós.

### Dados da sua criação e da sua região

- a cidade que você escolheu no cadastro ou no MyFarm: o nome da cidade, as coordenadas (latitude e longitude) e o código do país;
- o tipo de clima e o hemisfério que calculamos a partir dessa cidade;
- os animais que você cria e quantos de cada;
- as plantações que você escolheu;
- o diário: data, tipo de registro, nome do animal (se você quiser colocar) e o texto que você escreve.

### Dados técnicos e de segurança

- **sessões:** quando você entra, criamos uma sessão para manter você conectado. Guardamos uma versão embaralhada do código da sessão, quando ela vence e quando você usou o site pela última vez. A sessão termina depois de 1 hora sem uso e dura no máximo 30 dias;
- **tentativas de entrar:** o username digitado (só se tiver um formato válido), a hora e se deu certo. Usamos isso para bloquear a conta por um tempo depois de 5 senhas erradas seguidas;
- **limites de tentativas:** contadores ligados ao endereço IP ou à conta, para impedir abusos (como alguém tentando adivinhar senhas);
- **registro de atividade:** quem fez, o que fez, em quê, o endereço IP e quando, para as ações da conta (por exemplo: entrar, sair, trocar a senha, editar a criação ou o diário). Esse registro **nunca** guarda senhas, códigos de acesso nem o texto do seu diário;
- **registro de erros:** quando uma página do site dá erro, guardamos o endereço da página (sem o que vem depois do "?"), uma mensagem curta do erro (até 300 caracteres) e a hora. **Nunca** guardamos o conteúdo do pedido nem os cabeçalhos. Usamos isso para a segurança e a manutenção do site. A mensagem pode, por acaso, conter algo que você digitou;
- **códigos de e-mail:** os códigos dos links para trocar a senha e para confirmar o e-mail, guardados embaralhados;
- **medição de páginas:** só se você clicar em "Aceitar todos" no aviso de cookies. Guardamos um identificador aleatório do visitante, a sua conta (se estiver logado), a página visitada sem o que vem depois do "?", o site de origem (só o endereço do site), a data e a cidade e o país aproximados de onde você acessou (a Vercel calcula pelo endereço IP). **Não guardamos o endereço IP** nessa medição;
- **histórico de e-mails:** quais e-mails de novidades enviamos para você e quando;
- **formulário de contato:** o nome, o e-mail e a mensagem que você escreve na página Contato. Isso vai por e-mail (pelo Resend) para a nossa caixa de contato, só para responder você, e **não fica guardado no site**.

### Previsão do tempo

Guardamos por até 7 dias as previsões do tempo de cada lugar, identificado por coordenadas arredondadas (2 casas decimais). Isso não é ligado a nenhuma pessoa.

## 3. Para que usamos e com que base legal

- **Para oferecer o serviço** (sua conta, sua criação, o diário, as orientações para a sua região e a previsão do tempo): é a execução do contrato que você aceita ao criar a conta (na LGPD, art. 7º, V; no RGPD, art. 6º, 1, b).
- **Para a segurança e para evitar fraudes** (sessões, bloqueio depois de senhas erradas, limites de tentativas, registro de atividade e registro de erros): é o nosso interesse legítimo em proteger você e o site (na LGPD, art. 7º, IX; no RGPD, art. 6º, 1, f).
- **Para enviar e-mails da conta** (confirmar o e-mail, trocar a senha, lembrar o username): execução do contrato.
- **Para cobrar a assinatura** (criar e manter a assinatura, saber se ela está ativa): execução do contrato (LGPD, art. 7º, V; RGPD, art. 6º, 1, b).
- **Para medir as páginas visitadas** e entender o que o site precisa melhorar: o seu consentimento, dado em "Aceitar todos" (LGPD, art. 7º, I; RGPD, art. 6º, 1, a; e a regra de cookies da ePrivacy). Você pode tirar o consentimento quando quiser.
- **Para enviar e-mails de novidades (marketing):** só se você aceitou, e a base é o consentimento. Em todo e-mail há um link para sair da lista em um clique, e você também pode mudar isso em **Perfil**.

Não vendemos seus dados. Não usamos seus dados para anúncios.

## 4. Com quem dividimos e onde ficam os dados

Usamos alguns fornecedores para o site funcionar. Eles só tratam os dados para prestar esse serviço ao NewFarmer.

- **Supabase** (banco de dados): os dados ficam guardados na Irlanda, na União Europeia.
- **Vercel** (hospedagem do site): recebe os acessos ao site e guarda registros técnicos com o endereço IP. Pode tratar os dados na União Europeia ou nos Estados Unidos, com cláusulas contratuais-padrão.
- **Resend** (envio de e-mails): recebe o seu e-mail, nome e username para enviar os e-mails da conta e, se você aceitou, os e-mails de novidades; e as mensagens do formulário de contato.
- **Open-Meteo** (previsão do tempo): recebe o texto que você digita ao procurar uma cidade e as coordenadas da cidade, para devolver a previsão. Não recebe nenhum dado da sua conta.
- **Stripe** (pagamentos): processa o pagamento da assinatura, por conta própria e como nosso operador. Recebe o seu e-mail e os dados do cartão, que você digita no ambiente do Stripe. O Stripe guarda os dados de cobrança pelo prazo que a lei fiscal exige, mesmo depois de a sua conta no NewFarmer ser apagada.

### Quem tem acesso dentro do NewFarmer

O dono do site (administrador) vê o seu nome, e-mail, username, cidade, país, os animais e as plantações, a data de criação, a assinatura e as páginas visitadas. Isso serve para suporte, cobrança e e-mails de novidades. O administrador **não vê o seu diário**. Cada vez que ele abre o detalhe de uma pessoa, isso fica registrado.

Também podemos ter que entregar dados se uma lei ou uma ordem de autoridade obrigar.

## 5. Transferência para outros países

O NewFarmer é mantido no Brasil, o banco de dados fica na União Europeia e alguns fornecedores podem tratar dados nos Estados Unidos. Por isso, seus dados podem ser tratados no Brasil, na União Europeia e nos Estados Unidos. Nesses casos, usamos as proteções oferecidas pelos fornecedores, como as cláusulas contratuais-padrão.

## 6. Por quanto tempo guardamos

- **Conta e dados da criação:** enquanto a conta existir. Quando a conta é apagada, esses dados também são.
- **Registro de atividade:** 180 dias. **Tentativas de entrar:** 30 dias. Esses registros não são apagados junto com a conta: eles seguem esses prazos próprios e depois são apagados.
- **Registro de erros:** 180 dias.
- **Medição de páginas:** 180 dias.
- **Histórico de e-mails de novidades:** enquanto a conta existir.
- **Dados de cobrança no Stripe:** pelo prazo que a lei fiscal exige.
- **Limites de tentativas:** cerca de 1 dia.
- **Previsões do tempo:** até 7 dias.
- **Sessões:** até você sair, até 1 hora sem uso ou no máximo 30 dias.
- **Código para trocar a senha:** vale 1 hora. **Código para confirmar o e-mail:** vale 7 dias.

## 7. Seus direitos

Para usar qualquer direito, mande um e-mail para [contact@newfarmer.app](mailto:contact@newfarmer.app) a partir do e-mail da sua conta (ou diga qual é o seu username). Podemos pedir uma confirmação de que a conta é sua. Respondemos em até **15 dias** (LGPD), **30 dias** (RGPD) ou **45 dias** (leis dos EUA).

Duas coisas você mesmo faz no site, em **Perfil**, sem precisar pedir: **"Baixar meus dados"** entrega um arquivo (JSON) com a conta, os animais, as plantações, o diário, o seu registro de atividade, a assinatura, as páginas visitadas e a sua preferência de e-mails de novidades; **"Apagar minha conta"** cancela a assinatura e apaga na hora a conta e os dados dela, inclusive as páginas visitadas e o histórico de e-mails, depois de você digitar a senha.

### No Brasil (LGPD)

Você pode pedir: confirmação de que tratamos seus dados, acesso aos dados, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, eliminação, informação sobre com quem dividimos os dados e revogação do consentimento, quando ele for a base do tratamento. Você também pode reclamar à **ANPD** (Autoridade Nacional de Proteção de Dados).

### Na União Europeia (RGPD)

Você pode pedir: acesso, retificação, apagamento, limitação do tratamento, portabilidade e oposição ao tratamento feito por interesse legítimo. Você também pode reclamar à autoridade de proteção de dados do seu país (por exemplo, a **CNPD** em Portugal).

### Nos Estados Unidos (CCPA/CPRA e leis estaduais parecidas)

Você pode pedir para: saber quais dados temos e como usamos, apagar e corrigir seus dados. Você não será tratado de forma diferente por usar esses direitos.

O NewFarmer **não vende nem compartilha** dados pessoais para publicidade comportamental e não usa dados sensíveis para tirar conclusões sobre você. Por isso o site não tem um link "Do Not Sell or Share".

## 8. Cookies

Usamos 4 cookies essenciais, que o site precisa para funcionar e não pedem consentimento:

- **nf_session:** mantém você conectado.
- **nf_locale:** lembra o idioma.
- **nf_theme:** lembra o tema claro ou escuro.
- **nf_consent:** lembra a sua escolha no aviso de cookies.

Usamos 1 cookie só com o seu consentimento, ao clicar em "Aceitar todos":

- **nf_vid:** um identificador aleatório do visitante, por 1 ano, para medir as páginas visitadas (veja o item 2).

Não usamos cookies de propaganda. Para mudar a escolha, use o link **Preferências de cookies**, no rodapé do site e no Perfil. O `nf_cookie_notice` era o cookie do aviso antigo: hoje só é lido, vale como "só os essenciais" e não é mais criado. Se você clicar em "Só os essenciais", o `nf_vid` não é criado.

## 9. Crianças

O NewFarmer não é para menores de 13 anos. Se descobrirmos que uma conta é de uma criança com menos de 13 anos, ela será apagada.

## 10. Segurança

Guardamos senhas e códigos de acesso só embaralhados, usamos conexão segura (HTTPS), bloqueamos tentativas repetidas de adivinhar senhas e não guardamos mais dados do que o necessário. Nenhum sistema é totalmente seguro; se acontecer um incidente que possa trazer risco a você, vamos avisar você e as autoridades, como a lei manda.

## 11. Mudanças nesta política

A data no topo mostra a última atualização. Mudanças importantes serão avisadas no site.

**Modo offline:** para o site abrir sem internet, o aparelho guarda as páginas do app que você visitou e as anotações feitas sem internet, até serem enviadas. Isso fica só no seu aparelho e é apagado ao clicar em Sair e ao apagar a conta.
