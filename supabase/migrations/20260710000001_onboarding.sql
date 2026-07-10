-- Onboarding guiado: quem ainda não concluiu cai em /onboarding ao logar.
-- Backfill: contas existentes (criadas antes do onboarding existir) não
-- passam pelo fluxo.

alter table public.briefing_profiles
  add column onboarded_at timestamptz;

update public.briefing_profiles set onboarded_at = now();
