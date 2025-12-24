-- WriterCoach Supabase schema and policies.
-- Run this script in the SQL editor or supabase CLI before using the dashboard.

create extension if not exists "uuid-ossp";

-- Core tables
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  cefr_level text,
  goals text,
  role text default 'student',
  digest_opt_in boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text,
  due_date date,
  llm_prompt_templates jsonb,
  creator_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  reflection text,
  time_spent_minutes integer,
  word_count integer,
  draft_url text,
  transcript_url text,
  status text default 'submitted',
  submitted_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  author_role text default 'teacher',
  comment text,
  rubric_scores jsonb,
  audio_note_url text,
  created_at timestamptz default now()
);

create table if not exists public.progress_digests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  generated_at timestamptz default now(),
  reading_level text,
  focus_traits text[],
  strengths text[],
  next_steps text[],
  signature_expires_at timestamptz,
  signed_url text
);

-- Enable Row Level Security
alter table public.students enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;
alter table public.progress_digests enable row level security;

-- Students policies
create policy "Students can view their profile" on public.students
  for select using (auth.uid() = id);

create policy "Students can update their profile" on public.students
  for update using (auth.uid() = id);

create policy "Students can insert their profile" on public.students
  for insert with check (auth.uid() = id);

-- Assignments policies (read for all authenticated users, write for teachers)
create policy "Authenticated can read assignments" on public.assignments
  for select using (auth.role() = 'authenticated');

create policy "Teachers can insert assignments" on public.assignments
  for insert with check (
    exists (
      select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher'
    )
  );

create policy "Teachers can update assignments" on public.assignments
  for update using (
    exists (
      select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher'
    )
  );

-- Submissions policies
create policy "Students can read their submissions" on public.submissions
  for select using (
    auth.uid() = student_id
    or exists (select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher')
  );

create policy "Students can insert their submissions" on public.submissions
  for insert with check (auth.uid() = student_id);

create policy "Students can update their submissions" on public.submissions
  for update using (auth.uid() = student_id);

-- Feedback policies (teachers or owning student)
create policy "Students see feedback for their submissions" on public.feedback
  for select using (
    auth.uid() = student_id
    or exists (select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher')
  );

create policy "Teachers can add feedback" on public.feedback
  for insert with check (
    exists (
      select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher'
    )
  );

-- Progress digest policies
create policy "Students can read their digests" on public.progress_digests
  for select using (
    auth.uid() = student_id
    or exists (select 1 from public.students s where s.id = auth.uid() and s.role = 'teacher')
  );

create policy "Students can insert digests" on public.progress_digests
  for insert with check (auth.uid() = student_id);

-- Storage bucket for uploads
insert into storage.buckets (id, name, public)
values ('writercoach-submissions', 'writercoach-submissions', false)
on conflict (id) do nothing;

create policy "Students can upload their files" on storage.objects
  for insert
  with check (
    bucket_id = 'writercoach-submissions'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );

create policy "Students can read their files" on storage.objects
  for select
  using (
    bucket_id = 'writercoach-submissions'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );
