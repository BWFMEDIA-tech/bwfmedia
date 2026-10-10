-- Billing fields for the Tunevio subscription system
alter table public.subscriptions
  add column if not exists billing_interval text,
  add column if not exists trial_reminder_sent_at timestamptz;

-- Private lookup for the trial-reminder cron hook shared secret.
-- RLS enabled with no policies: only service-role/server code can read it.
create table if not exists public.hook_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT ALL ON public.hook_secrets TO service_role;
GRANT SELECT ON public.hook_secrets TO authenticated;
alter table public.hook_secrets enable row level security;

insert into public.hook_secrets (name, value)
values ('trial_reminders', encode(gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

-- Daily worker: calls the Tunevio trial-reminder hook with the stored secret.
create or replace function public.run_trial_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.hook_secrets where name = 'trial_reminders';
  if v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://project--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app/api/public/hooks/trial-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end
$$;

select cron.schedule('subscription-trial-reminders', '0 14 * * *', $$select public.run_trial_reminders()$$)
where not exists (select 1 from cron.job where jobname = 'subscription-trial-reminders');
