# WriterCoach

A zero-budget blueprint for monitoring ESL writing practice while learners leverage any external LLM they prefer. The platform records drafts, feedback artifacts, and progression metrics, but never brokers or pays for model access.

## Guiding Principles
- **LLM-agnostic:** Students can pick any public or local LLM interface (ChatGPT free tier, Poe, Gemini, Ollama, etc.) to obtain prompts or feedback. The platform only references the instructions they followed.
- **Costless by design:** Prefer open-source components, perpetual free tiers, and optional self-hosted services so neither teachers nor students incur recurring fees.
- **Learner-owned workflow:** Drafting happens locally (browser, desktop editor, or paper). Students upload artifacts and reflections rather than typing into a hosted editor.
- **Transparency for teachers:** Provide dashboards that surface attempt history, revisions, external prompts used, and teacher annotations.
- **Privacy-first:** Minimize stored data, allow pseudonymous participation, and keep any sensitive drafts on the learner's device unless they choose to share.

## Student Experience
1. **Prompt Intake:** The teacher shares a weekly exercise brief. Learners obtain detailed instructions or examples from an external LLM of their choice.
2. **Local Drafting:** Students write offline (Google Docs offline mode, LibreOffice, Markdown editors). They retain original drafts locally.
3. **Feedback Loop:** Learners may consult the LLM for feedback or grammar checks. The platform provides optional templates guiding how to ask the LLM (e.g., "List three grammar issues").
4. **Submission Package:** When ready, students upload:
   - Final draft (plain text or PDF extract).
   - LLM prompt/response transcript (manual paste or exported `.txt`).
   - Self-reflection checklist (structured form).
5. **Progress Snapshot:** The dashboard visualizes milestones, word counts, revision notes, and highlights outstanding teacher comments.

## Teacher Experience
- **Class Overview:** Filterable table of students with latest submission date, CEFR targets, and progress streaks.
- **Deep Dive:** For each submission, view uploaded draft, linked LLM transcript, automated grammar summary, and any peer/teacher comments.
- **Feedback Tools:** Annotate drafts, attach audio/video notes, and schedule follow-up tasks.
- **Analytics:** Export CSV summaries of error patterns, vocabulary goals, and completion rates without leaving the free tier.

## Architecture Overview
| Layer | Tooling (Free) | Purpose |
| --- | --- | --- |
| Frontend | [SvelteKit](https://kit.svelte.dev/) static export + [Tailwind](https://tailwindcss.com/) | Responsive dashboards and submission forms. Built to run entirely in the browser with offline caching. |
| Hosting | [GitHub Pages](https://pages.github.com/) static hosting (primary) with optional [Cloudflare Pages](https://pages.cloudflare.com/) fallback | Serves the static dashboard bundle and exposes submission webhooks via GitHub Actions. |
| Auth & Database | [Supabase free tier](https://supabase.com/pricing) | Stores student metadata, submission summaries, and teacher comments. |
| File Storage | Supabase storage buckets, [Cloudflare R2 free](https://developers.cloudflare.com/r2/pricing/), or encrypted Google Drive folder shared with teacher | Holds uploaded drafts and transcripts. |
| Automation | [n8n](https://n8n.io/) community edition (self-hosted) or GitHub Actions | Runs nightly analytics, reminder emails, and backups. |
| Local Utilities | Template scripts (Python/Node) for students to format transcripts and compute word counts offline | Ensures consistency without requiring server compute. |

### Why no hosted LLM?
- Students already have free options (public web UIs, local inference) and can switch without affecting the teacher portal.
- Avoids legal and cost concerns—only metadata about the external session is stored.
- Encourages autonomy: learners compare outputs from multiple LLMs and reflect on differences.

## Data Model (Minimal)
| Table | Key Fields | Notes |
| --- | --- | --- |
| `students` | `id`, `display_name`, `cefr_level`, `preferred_tools`, `guardian_contact` (optional) | Allow pseudonyms; link guardians only if necessary. |
| `assignments` | `id`, `title`, `instructions`, `due_date`, `llm_prompt_templates` | Templates are plain text suggestions for students to copy. |
| `submissions` | `id`, `student_id`, `assignment_id`, `submitted_at`, `word_count`, `transcript_url`, `draft_url`, `self_reflection` (JSON) | File URLs point to free storage with access rules. |
| `feedback` | `id`, `submission_id`, `author_role`, `comment_text`, `tags`, `created_at` | Supports teacher or peer feedback. |
| `metrics_daily` | `student_id`, `date`, `minutes_spent`, `words_written`, `llm_used` | Optional; populated via manual entry or CSV import. |

## Workflow Automation
1. **Submission Intake:** Serverless function validates file size (limit to keep within free storage), extracts plain text for analytics, and queues grammar analysis.
2. **Grammar & Style Checks:** Run [LanguageTool](https://languagetool.org/dev) via self-hosted container or Supabase Edge Function. Results are cached per submission.
3. **Progress Reports:** Weekly email (using [Resend free tier](https://resend.com/pricing) or [Brevo](https://www.brevo.com/pricing/free/)) summarizing completed assignments and common error types.
4. **Teacher Notes:** Inline annotations stored as JSON (range start/end) to reconstruct highlights when rendering the draft.
5. **Data Portability:** CLI script exports everything to Markdown/CSV for archival without vendor lock-in.

## Implementation Phases
1. **Week 1 – Foundations**
   - Scaffold SvelteKit project with Supabase auth integration (email magic link + row level security).
   - Configure GitHub Pages deployment workflow (`svelte-kit sync`, `npm run build`, push to `gh-pages`).
   - Implement submission form accepting text upload + transcript text area.
   - Offline-first caching using service workers (PWA manifest).
2. **Week 2 – Teacher Dashboard**
   - Class overview table with filters, submission timelines, and streak indicators.
   - Detail view showing draft preview, transcript, and self-reflection.
3. **Week 3 – Feedback & Automation**
   - Inline annotation UI and comment threads.
   - LanguageTool integration (self-hosted container or Supabase Edge function).
   - n8n workflow for reminders and weekly summaries.
4. **Week 4 – Polishing & Docs**
   - Package student onboarding kit (PDF + scripts) explaining how to use external LLMs safely.
   - Add teacher analytics exports and privacy controls.
   - Document backup strategy and manual recovery procedures.

## GitHub Pages Deployment Workflow
1. Enable GitHub Pages on the repository (Settings → Pages → "GitHub Actions").
2. Add the official [SvelteKit Static Adapter](https://kit.svelte.dev/docs/adapter-static) and configure `paths.base` if hosting on a project subpath.
3. Create `.github/workflows/deploy.yml` using the [`actions/deploy-pages`](https://github.com/actions/deploy-pages) action:
   - Install dependencies, run `npm run build`, and upload the `build/` folder as an artifact.
   - Deploy on pushes to `main` and optionally manual dispatch.
4. Protect `main` with branch rules so only reviewed changes trigger deployments.
5. For local preview, use `npm run preview` and verify offline caching before pushing.

## Supabase Setup Checklist
1. **Project & Auth**
   - Create a new project in your Supabase account (Region closest to students).
   - Enable Email magic link authentication; disable phone auth to stay within free tier.
   - Define RLS policies on `students`, `submissions`, and `feedback` tables (students can read/write their own rows; teachers have elevated role via Supabase Dashboard).
2. **Database Schema**
   - Use SQL Editor → "New Query" to run the schema from the Data Model section.
   - Seed demo data with the Supabase Table Editor for onboarding.
3. **Storage Buckets**
   - Create `drafts` and `transcripts` buckets; enable public read only for signed URLs that expire (e.g., 1 hour).
   - Enforce file size limits using storage policies.
4. **Edge Functions (Optional)**
   - Deploy a `submission-intake` function to validate uploads and trigger LanguageTool checks.
   - Schedule nightly summaries with Supabase Cron or GitHub Actions hitting the function endpoint.
5. **Local Development**
   - Pull the Supabase project config via `supabase link` and run `supabase start` for a local replica during development.
   - Commit `.supabase` configuration safely (without secrets) and load environment variables via `.env.local`.

## Integration Notes
- Use GitHub Actions secrets for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and service role keys. Reference them in deployment workflows and serverless scripts.
- For client-side calls, rely on the anon key and enforce all writes through RLS-protected tables.
- When exporting analytics to CSV, run a GitHub Action that queries Supabase using the service role key stored as an encrypted secret, then pushes reports to a private teacher-only branch or releases.

## Student Onboarding Kit (Deliverables)
- **Quick-start guide:** Screenshots showing how to obtain prompts/feedback from popular free LLM portals and copy transcripts.
- **Local word-count script:** Cross-platform CLI (Python) that calculates word counts and generates a metadata JSON to upload.
- **Reflection checklist:** Printable PDF + web form reminding students to note what they learned from the LLM.
- **Ethics module:** Short lesson on evaluating AI feedback critically and avoiding plagiarism.

## Cost Management & Sustainability
- Limit file uploads (e.g., 2MB) to stay within free storage allowances.
- Purge raw drafts after 90 days while keeping metrics; encourage students to keep personal archives locally.
- Rely on static generation so cold starts are rare and serverless invocations stay under free quotas.
- Encourage community contributions to expand prompt templates and onboarding materials.

## Security & Privacy Considerations
- Use student-selected pseudonyms; map to real identities offline.
- Provide consent forms explaining that transcripts from third-party LLMs may include personal data.
- Encrypt stored files at rest; restrict access to teacher accounts via role-based permissions.
- Offer data deletion on request and document how to revoke access from Supabase/Firestore.

## License
MIT License (to be added) — keeps the project open for educators to adapt.
