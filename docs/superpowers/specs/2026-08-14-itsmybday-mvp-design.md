# ItsMyBday — Desenho do MVP

## Contexto

O 300 Sky Bar (e outras casas do grupo: 300 Jurerê, Lipy) hoje gerencia pedidos de
aniversário e listas de convidados de forma manual, com apoio do **pensanoevento.com.br**
(usado internamente pela equipe pra subir listas pro check-in da portaria — não é
usado diretamente pelos promoters). O ItsMyBday nasce pra cobrir tudo que vem
*antes* disso: o pedido do cliente, a aprovação, a classificação, a montagem da
lista e o relacionamento com promoters/DJs.

Este MVP é escopado para **uma única casa (300 Sky Bar)**, mas o modelo de dados
já isola tudo por `venue_id` para permitir múltiplas casas no futuro sem retrabalho.

## Papéis e acesso

- **Admin** (equipe do 300 Sky Bar): painel completo — pedidos, classificação,
  listas, promoters, grade de horários disponíveis, regras da casa.
- **Convidado/Aniversariante**: sem login. Acessa por formulário público e, depois,
  por link único da lista.
- **Promoter/DJ**: login próprio (Supabase Auth). Vê e gerencia só os próprios
  dados (indicações, conversões, comissões).

## Fluxo principal

1. **Pedido**: convidado (ou promoter em nome de alguém) preenche formulário
   público — data (calendário, só mostra datas/horários que o admin liberou
   manualmente numa grade), quantidade de pessoas, Instagram, WhatsApp. Se veio
   de um promoter, o pedido é marcado com esse vínculo.
2. **Aprovação**: pedido aparece no painel do admin como pendente, e uma
   notificação chega no WhatsApp (via Nicochat). Admin aprova/nega pelo painel
   **ou** respondendo ACEITAR/NEGAR no WhatsApp.
   - Negado → admin escolhe/edita um motivo (sugestões prontas: "casa alugada
     pra evento", "lotação máxima pra essa data", "quer tentar outra data?") →
     mensagem formatada enviada ao convidado via WhatsApp.
   - Aprovado → segue para classificação.
3. **Classificação** (etiqueta livre, sem regra rígida salva): Tudo VIP / VIP até
   X hora / Valor por gênero / Pagar valor antecipado. Os valores e horários são
   sempre digitados manualmente pelo admin naquele momento — não há tabela de
   preço fixa no sistema.
4. **Reserva no GetIn**: ao aprovar, o ItsMyBday cria a reserva automaticamente
   via API do GetIn (nome, data, quantidade). *Dependência externa: chave/API
   do GetIn — a levantar com o parceiro antes da implementação. Até lá, cai
   como lembrete manual no painel.*
5. **Montagem da lista**: admin define, por evento, o limite de homens/mulheres
   e o horário limite pra acrescentar nomes. Sistema gera um **link único
   compartilhável** — quem recebe o link acrescenta nomes até o horário limite,
   sem login.
6. **Mensagens automáticas via WhatsApp (Nicochat)**: link da lista e regras da
   casa (dress code, taxas, tolerância, horários, no-show — texto configurável
   por casa, não por evento) são enviados ao aprovar.
7. **Fechamento pro pensanoevento**: ao fechar a lista, o admin sobe a lista
   final manualmente no pensanoevento.com.br. O envio automático via API já
   fica modelado no sistema como opção desativada, pronta pra ligar quando a
   integração for viabilizada com o pensanoevento — mesmo padrão do GetIn.

## Painel de Promoters/DJs

- Login próprio, dados isolados por promoter.
- Registra indicações em 3 tipos: aniversário de influencer, aniversário de
  cliente comum, aniversário do próprio promoter/DJ.
- Contador de conversão: quantos pedidos indicados por ele viraram aprovados.
- Comissão por indicação: campo numérico + seletor de tipo (**R$ fixo por
  convidado** ou **% sobre o consumo**). Sem integração com PDV (Lorean é só um
  PDV, não entra no escopo) — o valor de consumo é digitado manualmente pelo
  admin depois do evento, quando aplicável.
- Regra de pagamento: campo de texto livre configurável pelo admin (ex:
  "pagamento toda sexta", "via Pix em até 5 dias"). Só exibição — sem
  processamento de pagamento no app.
- Upload de lista de contatos pra disparo de WhatsApp em nome do promoter via
  Nicochat, com tela de consentimento/LGPD antes do upload (o promoter confirma
  que tem permissão de uso daqueles contatos).

## Integrações externas

| Integração | Papel | Status |
|---|---|---|
| **GetIn** | cria reserva automaticamente ao aprovar pedido | precisa de API/chave do parceiro |
| **Nicochat** (WhatsApp) | notificações, comando ACEITAR/NEGAR, envio de link/regras, disparo em massa dos promoters | precisa mapear API/webhook do Nicochat |
| **pensanoevento.com.br** | recebe a lista final pro check-in da portaria | manual no MVP; opção de API já modelada, desligada até integrar |
| **Lorean** | — | fora de escopo, é só PDV interno da casa |

## Design visual

Direção aprovada: **Dark Balada** — fundo preto, cards em cinza-escuro, detalhe
dourado (`#D4AF6A`) para ações primárias e destaques, tipografia serif para
títulos (clima de casa noturna) e sans-serif para corpo/dados. Minimalista:
pouco ruído visual, hierarquia clara entre dado principal (nome, data) e
metadado (Instagram, WhatsApp, quantidade).

## Stack técnica

- **Next.js** (React) como PWA — funciona como app no celular sem passar por
  loja de aplicativos, um único código pra admin, promoters e formulário
  público, com rotas protegidas por papel.
- **Supabase**: Postgres (dados isolados por `venue_id`), Auth (login de admin
  e promoters), Storage (upload de lista de contatos), Realtime (painel do
  admin atualiza sozinho quando chega pedido novo).
- Deploy simples (Vercel), sem custo de loja de app.

## Fora de escopo neste MVP (fica pra depois)

- Processamento de pagamento (Pix/cartão) dentro do app — por enquanto só
  marca "precisa pagar antecipado" e a cobrança é combinada fora do app.
- Suporte a múltiplas casas simultâneas na interface (o modelo de dados já
  permite, mas o MVP roda só com 300 Sky Bar ativo).
- Qualquer automação com Lorean.
- Envio automático pro pensanoevento (fica como opção pronta, desligada).
