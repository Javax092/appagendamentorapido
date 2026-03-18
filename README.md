# O Pai ta on

App React para barbearia com:

- reserva publica por barbeiro
- login de equipe com Supabase Auth
- RLS real por perfil
- catalogo individual por profissional
- CRM de clientes
- fila de notificacoes pronta para WhatsApp oficial
- gestao de equipe e acesso
- galeria visual para cortes e marca

## Rodar

```bash
npm install
npm run dev
```

Preview de producao:

```bash
npm run build
npm run preview -- --port 4174
```

## Estrutura

- `src/App.jsx`: orquestracao principal do app
- `src/components/`: secoes modulares da interface
- `src/data.js`: fallback local e brand assets
- `src/lib/api.js`: camada de dados e chamadas para Supabase/Edge Functions
- `src/lib/supabase.js`: cliente Supabase
- `supabase/schema.sql`: schema, RLS, seeds e fila de notificacoes
- `supabase/functions/manage-staff-user/`: Edge Function para criar/editar equipe
- `supabase/functions/process-whatsapp-queue/`: Edge Function para envio oficial via Meta

## Supabase

1. Rode o SQL de [supabase/schema.sql](/home/limax44/appmobilebarbearia/supabase/schema.sql).
2. Copie `.env.example` para `.env`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Defina `VITE_PASSWORD_RESET_URL` com a URL publica do app.
5. Rode `npm run dev`.

## WhatsApp oficial

O app usa o numero comercial `5592986202729` como referencia visual e de fila.

Para envio real pela Meta Cloud API, configure nas Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_NUMBER=5592986202729`

Sem `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`, a fila existe, mas o disparo oficial nao acontece.

## Midia editavel

O app agora usa:

- tabela `public.app_brand_settings`
- tabela `public.gallery_posts`
- bucket `storage.opaitaon-media`

Admins podem trocar logo e posts pelo painel, sem editar codigo.

## Observacao operacional

O schema ja foi aplicado no banco remoto usado neste projeto, incluindo:

- usuarios iniciais da equipe
- perfis de acesso
- catalogos por barbeiro
- CRM inicial
- logs de aplicacao
- notificacoes automatizadas
