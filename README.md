# WriterCoach

WriterCoach is a blueprint for a no-cost ESL writing coach that runs as a static GitHub Pages site backed by Supabase. Students, teachers, and even helper LLMs can review the same progress timeline without the platform ever brokering paid AI access.

## Why the new workflow?
- **Simpler hosting:** ship a static SvelteKit bundle to GitHub Pages and call Supabase directly for auth, database, and storage.
- **Single source of truth:** Supabase tables store assignment status, reflections, and generated progress digests that everyone (student, teacher, or LLM) can reference.
- **Low-friction adoption:** learners keep drafting in their preferred tools, upload evidence when ready, and instantly see how the teacher responded.

## Shared progress at a glance
| Audience | What they see | How they access it |
| --- | --- | --- |
| Student | Assignment list, submission streak, feedback queue, and LLM coaching tips. | Secure dashboard on GitHub Pages (Supabase magic-link auth). |
| Teacher | Class leaderboard, individual timelines, transcript attachments, rubric scoring. | Same dashboard with elevated Supabase role. |
| LLM co-pilot | Read-only digest of the student’s skill profile, latest goals, and open teacher comments. | Signed Supabase edge function URL exposed via copy button inside the dashboard. |

## Simplified learner workflow
1. **Check the brief:** Student opens the GitHub Pages dashboard, signs in, and reads the week’s assignment plus suggested LLM prompt starters.
2. **Draft anywhere:** Writing happens offline or in any editor. Students optionally query external LLMs and save the conversation transcript.
3. **Upload evidence:** The dashboard form uploads the final draft, transcript, and self-reflection to Supabase storage, logging word count and time-on-task.
4. **Review feedback:** Teacher annotations and rubric scores appear in the student’s timeline. Both parties can revisit the full history at any time.
5. **Share with an LLM:** Student clicks “Generate progress digest,” copies the signed link, and pastes it into their preferred LLM so the model adapts to their goals during the next coaching session.

## Teacher workflow
1. **Plan assignments:** Teachers create prompts, due dates, and rubric items directly in Supabase (SQL editor or simple admin UI).
2. **Monitor submissions:** GitHub Pages dashboard pulls real-time data—late flags, streak counts, and error tags—from Supabase views.
3. **Respond quickly:** Inline annotations, quick-reply templates, and audio notes are stored as `feedback` rows tied to each draft.
4. **Spot trends:** A Supabase materialized view aggregates grammar issues and vocabulary goals, exportable as CSV for department meetings.
5. **Coach with context:** Teachers can generate the same progress digest students share with LLMs, ensuring human and AI feedback stay aligned.

## Progress digests for LLM adapters
- **Supabase edge function `progress_digest`:** Accepts a submission ID or student ID and returns a condensed JSON snapshot (reading level, goals, recurring errors, last teacher comments).
- **Rotating signatures:** Students trigger a one-hour signed URL that can be pasted into ChatGPT, Claude, or any other LLM so the model can tailor prompts.
- **Privacy controls:** Digests exclude raw drafts by default and only surface metrics the student explicitly allows. Teachers can revoke a digest instantly by invalidating the signature.

## Architecture (lean stack)
| Layer | Tooling | Purpose |
| --- | --- | --- |
| Frontend | SvelteKit static export hosted on GitHub Pages | Responsive dashboards, forms, and digest copy actions. |
| Auth & Database | Supabase (auth, Postgres, row-level security) | Handles users, assignments, submissions, feedback, and progress digests. |
| Storage | Supabase storage buckets | Holds uploaded drafts, transcripts, and audio notes with signed URL access. |
| Edge Functions | Supabase Functions | Generate digests, validate uploads, compute reading levels, and sync streak metrics nightly. |
| Automation | GitHub Actions cron hitting Supabase function | Sends weekly summaries and refreshes analytics without extra services. |

## Data model essentials
| Table | Key fields | Notes |
| --- | --- | --- |
| `students` | `id`, `display_name`, `cefr_level`, `goals`, `digest_opt_in` | Row Level Security ensures students only see their own data. |
| `assignments` | `id`, `title`, `instructions`, `due_date`, `llm_prompt_templates` | Templates surface directly in the dashboard. |
| `submissions` | `id`, `student_id`, `assignment_id`, `submitted_at`, `word_count`, `draft_url`, `transcript_url`, `reflection`, `time_spent_minutes` | Uploads go to Supabase storage with automatic virus scanning. |
| `feedback` | `id`, `submission_id`, `author_role`, `comment`, `rubric_scores`, `audio_note_url`, `created_at` | Supports teacher or peer input. |
| `progress_digests` | `id`, `student_id`, `generated_at`, `reading_level`, `focus_traits`, `strengths`, `next_steps`, `signature_expires_at` | Populated by edge function when a digest is requested. |

## Implementation milestones
1. **Day 1 – Static shell:** Scaffold SvelteKit, configure Supabase client, deploy to GitHub Pages via Actions.
2. **Day 3 – Auth & submissions:** Enable magic-link auth, build submission form, enforce RLS, and wire uploads to storage buckets.
3. **Day 5 – Dashboards:** Create student timeline and teacher class overview using Supabase views for streaks and late flags.
4. **Day 7 – Feedback tools:** Add annotation UI, quick replies, and rubric entry forms backed by `feedback` table mutations.
5. **Day 10 – LLM digest:** Deploy `progress_digest` function, add “copy digest link” modal, and document safety controls.

## Operational guidelines
- Protect `main` branch so deployments to GitHub Pages require review.
- Store Supabase keys as GitHub secrets; client only uses anon key with strict RLS policies.
- Purge old file uploads after 90 days while retaining digest metadata for longitudinal analysis.
- Provide students with a PDF onboarding guide explaining how to use digests with different LLMs responsibly.

## License
MIT License (to be added) — keeps the project open for educators to adapt.
