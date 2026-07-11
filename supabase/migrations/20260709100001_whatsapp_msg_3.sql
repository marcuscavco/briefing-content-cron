-- Briefing no WhatsApp agora vai em até 3 mensagens por categoria
-- (must-read · outros assuntos · posts) — decisão de UX do Marcus.
alter table public.briefings add column whatsapp_msg_3 text;
