-- Rainbow Magic Learning persistent backend schema
-- Safe additive migration: does not drop learner data.
create extension if not exists pgcrypto;

create table if not exists learner_profiles (
  learner_id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  birth_year_or_age text,
  current_grade_level text,
  preferred_themes jsonb not null default '[]'::jsonb,
  preferred_characters jsonb not null default '[]'::jsonb,
  preferred_activity_types jsonb not null default '[]'::jsonb,
  accessibility_preferences jsonb not null default '{}'::jsonb,
  typical_session_length integer not null default 20,
  current_overall_stage text,
  curriculum_version text not null default '2026.09.07-v1',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(parent_user_id, display_name)
);

create table if not exists learner_skill_progress (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  domain text not null,
  subdomain text,
  skill_id text not null,
  skill_name text not null,
  skill_level integer not null default 1,
  mastery_state text not null default 'NOT_INTRODUCED' check (mastery_state in ('NOT_INTRODUCED','INTRODUCED','LEARNING','DEVELOPING','MOSTLY_MASTERED','MASTERED','REVIEW_NEEDED')),
  mastery_score numeric(5,4) not null default 0,
  confidence_score numeric(5,4) not null default 0,
  independent_accuracy numeric(5,4) not null default 0,
  hinted_accuracy numeric(5,4) not null default 0,
  attempt_count integer not null default 0,
  independent_correct_count integer not null default 0,
  hinted_correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_practiced_at timestamptz,
  last_mastered_at timestamptz,
  next_review_at timestamptz,
  difficulty_level integer not null default 1,
  consecutive_successful_sessions integer not null default 0,
  consecutive_struggle_sessions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(learner_id, skill_id)
);

create table if not exists learning_sessions (
  session_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration integer,
  theme text,
  curriculum_version text not null default '2026.09.07-v1',
  skills_practiced jsonb not null default '[]'::jsonb,
  skills_introduced jsonb not null default '[]'::jsonb,
  activities_completed integer not null default 0,
  reward_earned jsonb,
  overall_engagement text,
  session_summary text,
  created_at timestamptz not null default now()
);

create table if not exists learning_attempts (
  attempt_id uuid primary key,
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  session_id uuid references learning_sessions(session_id) on delete set null,
  activity_id text not null,
  domain text not null,
  skill_id text not null,
  interaction_type text not null,
  difficulty integer not null default 1,
  question_or_task_id text,
  expected_answer jsonb,
  learner_response jsonb,
  result text not null,
  hint_level_used integer not null default 0,
  number_of_attempts integer not null default 1,
  parent_help_used boolean,
  response_time_ms integer,
  completed boolean not null default true,
  timestamp timestamptz not null default now(),
  curriculum_version text not null default '2026.09.07-v1'
);
create index if not exists idx_attempts_learner_time on learning_attempts(learner_id,timestamp desc);
create index if not exists idx_attempts_skill on learning_attempts(learner_id,skill_id,timestamp desc);

create table if not exists review_schedule (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  skill_id text not null,
  due_at timestamptz not null,
  reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(learner_id, skill_id, due_at)
);

create table if not exists curriculum_versions (
  curriculum_version text primary key,
  activated_at timestamptz not null default now(),
  notes text
);
insert into curriculum_versions(curriculum_version,notes)
values ('2026.09.07-v1','Initial versioned mastery curriculum graph')
on conflict (curriculum_version) do nothing;

alter table learner_profiles enable row level security;
alter table learner_skill_progress enable row level security;
alter table learning_sessions enable row level security;
alter table learning_attempts enable row level security;
alter table review_schedule enable row level security;

-- Parent owns all records beneath their learner profile.
drop policy if exists learner_profiles_owner on learner_profiles;
create policy learner_profiles_owner on learner_profiles for all to authenticated
using (parent_user_id = auth.uid()) with check (parent_user_id = auth.uid());

drop policy if exists learner_skill_owner on learner_skill_progress;
create policy learner_skill_owner on learner_skill_progress for all to authenticated
using (exists(select 1 from learner_profiles p where p.learner_id=learner_skill_progress.learner_id and p.parent_user_id=auth.uid()))
with check (exists(select 1 from learner_profiles p where p.learner_id=learner_skill_progress.learner_id and p.parent_user_id=auth.uid()));

drop policy if exists learning_sessions_owner on learning_sessions;
create policy learning_sessions_owner on learning_sessions for all to authenticated
using (exists(select 1 from learner_profiles p where p.learner_id=learning_sessions.learner_id and p.parent_user_id=auth.uid()))
with check (exists(select 1 from learner_profiles p where p.learner_id=learning_sessions.learner_id and p.parent_user_id=auth.uid()));

drop policy if exists learning_attempts_owner on learning_attempts;
create policy learning_attempts_owner on learning_attempts for all to authenticated
using (exists(select 1 from learner_profiles p where p.learner_id=learning_attempts.learner_id and p.parent_user_id=auth.uid()))
with check (exists(select 1 from learner_profiles p where p.learner_id=learning_attempts.learner_id and p.parent_user_id=auth.uid()));

drop policy if exists review_schedule_owner on review_schedule;
create policy review_schedule_owner on review_schedule for all to authenticated
using (exists(select 1 from learner_profiles p where p.learner_id=review_schedule.learner_id and p.parent_user_id=auth.uid()))
with check (exists(select 1 from learner_profiles p where p.learner_id=review_schedule.learner_id and p.parent_user_id=auth.uid()));

create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists learner_profiles_updated on learner_profiles;
create trigger learner_profiles_updated before update on learner_profiles for each row execute function set_updated_at();
drop trigger if exists learner_skill_progress_updated on learner_skill_progress;
create trigger learner_skill_progress_updated before update on learner_skill_progress for each row execute function set_updated_at();
