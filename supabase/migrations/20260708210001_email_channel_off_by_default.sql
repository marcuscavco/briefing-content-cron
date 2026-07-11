-- DECISÃO DE PRODUTO (2026-07-08, Marcus): entrega só por WhatsApp por enquanto.
-- O canal email nasce DESLIGADO para novas contas porque sem domínio próprio
-- verificado no Resend (resend.com/domains) o envio só funciona para o email da
-- conta Resend — qualquer outro destinatário falha com 403.
--
-- Para reativar email como default no futuro:
--   1. verificar o domínio no Resend (3 registros DNS);
--   2. trocar a env EMAIL_FROM para um endereço do domínio (ex.: briefing@dominio.com);
--   3. reverter este default para '{"email": true, "whatsapp": false}'.
-- O código de entrega já está pronto (testado E2E) — é só ligar o canal.

alter table public.briefing_profiles
  alter column channels set default '{"email": false, "whatsapp": false}'::jsonb;
