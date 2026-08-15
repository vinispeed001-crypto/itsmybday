# ItsMyBday

Sistema de pedido, aprovação e montagem de lista de convidados do 300 Sky Bar.

## Supabase setup

1. Create a project at supabase.com.
2. In the SQL editor, run the migrations IN ORDER: `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_guest_list_capacity_guard.sql`, then `supabase/seed.sql`.
3. Under Authentication → Users, create the first admin user (email + password).
4. In the SQL editor, link that user to the seeded venue as admin:
   ```sql
   insert into profiles (id, venue_id, role, full_name)
   values ('<auth-user-uuid-from-step-3>', '00000000-0000-0000-0000-000000000001', 'admin', 'Admin 300 Sky Bar');
   ```
5. Copy Project Settings → API → Project URL, anon key, and service_role key into `.env.local` (see `.env.local.example`).
6. Under Database → Replication (or Realtime settings), make sure the `requests` table is added to the `supabase_realtime` publication — the admin dashboard's live-updating pending-requests list depends on this. Without it, the dashboard still works but won't auto-refresh when a new request comes in; the admin would need to manually reload.

## Rodando localmente

1. Siga "Supabase setup" acima para criar o banco e o primeiro admin.
2. Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu projeto Supabase.
3. Instale as dependências: `npm install`
4. Rode em desenvolvimento: `npm run dev` — abre em http://localhost:3000
5. Formulário público: http://localhost:3000/300-sky-bar/pedido
6. Painel admin: http://localhost:3000/admin/login

## Testes

```bash
npm test
```

88 testes no total, cobrindo as regras de domínio (disponibilidade, classificação, lista de convidados), as rotas de API e os componentes de UI (formulário público, painel admin, formulários de decisão/classificação/lista/regras/disponibilidade, botão de resolver integração).

## Build de produção

```bash
npm run build
```

## Deploy

1. Crie um projeto na Vercel apontando pra este repositório.
2. Configure as mesmas variáveis de `.env.local` nas Environment Variables da Vercel.
3. Deploy automático a cada push na branch principal.

## Ícones do PWA são placeholder

`public/icon-192.png` e `public/icon-512.png` são quadrados sólidos escuros gerados por
`scripts/make-placeholder-icons.js` — servem pra testar a instalação do app na tela inicial,
mas não têm identidade visual nenhuma. **Antes de divulgar o "adicionar à tela inicial" pra
convidados de verdade, troque esses dois arquivos por ícones reais da marca** (mesmo tamanho:
192x192 e 512x512, PNG). O script não precisa rodar de novo automaticamente — é uma ferramenta
manual de bootstrap, não faz parte do build.

## Pendências manuais (até liberar as integrações)

Toda aprovação, recusa e criação de lista gera um item em `/admin/integracoes` — é ali que
a equipe confere o que ainda precisa ser feito manualmente:
- Lançar a reserva no GetIn (até termos a API/chave do parceiro).
- Mandar a mensagem no WhatsApp (até mapearmos a API/webhook do Nicochat).
- Subir a lista final no pensanoevento (até integrarmos a API deles).

## Checklist de QA manual

Não há um projeto Supabase real conectado neste ambiente de desenvolvimento, então este
checklist não pôde ser executado ponta a ponta automaticamente. Quem configurar um projeto
Supabase de verdade (seguindo "Supabase setup" acima) deve rodar este roteiro manualmente no
navegador antes de liberar o sistema pra uso real:

1. Abrir `/300-sky-bar/pedido`, enviar um pedido → confirmar que ele aparece em `/admin` após fazer login.
2. Em `/admin/pedidos/<id>`, clicar em "Negar", escolher um motivo sugerido, confirmar → o status deve mostrar "negado" com o motivo.
3. Enviar um segundo pedido, aprová-lo, preencher a classificação (`valor_genero`), criar uma lista de convidados → confirmar que a página `/lista/<token>` carrega e aceita nomes até o máximo configurado, e rejeita o (máximo+1)-ésimo nome de um gênero.
4. Confirmar que `/admin/integracoes` lista a reserva pendente no GetIn e o aviso pendente no WhatsApp daquela aprovação, e que "Marcar como feito" remove o item da lista.
5. Editar as regras da casa em `/admin/regras`, recarregar a página, confirmar que o texto salvo persiste.
6. Adicionar um horário de disponibilidade em `/admin/disponibilidade` datado de amanhã, confirmar que `/api/availability?venue=300-sky-bar` inclui esse horário.
7. Em um celular, abrir o site e usar "Adicionar à tela inicial" — confirmar que instala com o nome ItsMyBday e o ícone escuro.
8. Testar a trava de capacidade em envios concorrentes (Task 12): com apenas uma vaga aberta pra um gênero, tentar adicionar dois nomes quase ao mesmo tempo (duas abas do navegador) — confirmar que só um consegue e o outro recebe uma mensagem clara de "vagas esgotadas", não um erro 500.
9. Criar uma lista com horário limite (`deadline_at`) no passado, tentar adicionar um convidado pelo link público → confirmar que aparece "O horário limite pra essa lista já passou." em vez de um erro genérico.
10. Testar as travas de duplo clique (Tasks 9/11): clicar duas vezes rapidamente em "Aceitar" num pedido pendente, e duas vezes rapidamente em "Gerar lista" — confirmar que nenhum dos dois cria linhas duplicadas em `integration_events` nem listas de convidados duplicadas.
