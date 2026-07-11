-- Fase 5: Instagram connector — kill-switch global + feature por plano.
-- O kill-switch desliga o connector para a plataforma INTEIRA sem deploy
-- (togglável no backoffice /admin). A feature `instagram` habilita a coleta
-- para contas com assinatura vigente de um plano que a inclua (hoje: pro).

insert into public.app_config (key, value)
values ('instagram_connector_enabled', 'true'::jsonb)
on conflict (key) do nothing;

update public.plans
set features = features || '{"instagram": true}'::jsonb
where id = 'pro';
