# WriterCoach

A zero-budget plan for a lightweight ESL writing coach that provides prompts and feedback without recurring costs.

## Guiding Principles
- **All-free stack:** Favor open-source components and hosting tiers with permanent free allowances (no credit card requirements where possible).
- **Lean scope:** Build only the conversational writing coach with prompt delivery, response capture, and actionable feedback.
- **Offline-friendly:** Allow local execution of heavy models so the core experience works without paid inference.

## Architecture Overview
| Layer | Tooling (Free) | Notes |
| --- | --- | --- |
| Frontend | [SvelteKit](https://kit.svelte.dev/) or [Next.js static export](https://nextjs.org/docs/pages/building-your-application/deploying/static-exports) | Bundles to static files served from a CDN. |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com/) (static) or [Hugging Face Spaces](https://huggingface.co/spaces) (Gradio) | Both have free tiers with GitHub integration. |
| Backend/API | Serverless functions on Cloudflare Pages/Workers free tier, or a lightweight Python FastAPI app on Hugging Face Spaces (CPU). | Avoids always-on paid servers. |
| Database | [Supabase free tier](https://supabase.com/pricing) or [Firebase Firestore Spark](https://firebase.google.com/pricing) for auth + storage. | For zero budget, limit data retention (e.g., 500MB) and archive old sessions manually. |
| Prompt & Feedback Engine | Open-source LLM (see below) orchestrated via Python. | Keep prompts deterministic and cache frequent outputs. |
| Grammar/Spell Check | [LanguageTool](https://languagetool.org/dev) Community Edition (self-host) or [Grammark](https://github.com/devinrchang/grammark). | Run locally or within the same free hosting container. |

## Free LLM Options
| Model | How to use for free | Pros | Trade-offs |
| --- | --- | --- | --- |
| [Phi-3-mini-4k-instruct](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct) | Run locally via [Ollama](https://ollama.com/) or Hugging Face Spaces CPU. | Good balance of quality and size. | CPU inference is slower; needs quantization for Spaces. |
| [Mistral-7B-Instruct v0.2](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2) | Local GPU or quantized GGUF on CPU (Ollama, llama.cpp). | Stronger grammar feedback. | Requires 16GB RAM for smooth inference. |
| [OpenHermes-2.5-Mistral](https://huggingface.co/teknium/OpenHermes-2.5-Mistral) | Same as above. | Conversational tone well-suited to coaching. | Creative but may hallucinate; enforce structured outputs. |

### Inference Strategy
1. **Primary path:** Run Phi-3 or Mistral locally via Ollama. Ship a helper script that wraps `ollama run` with system prompts enforcing JSON feedback (errors, suggestions, encouragement).
2. **Hosted fallback:** Provide a ready-to-fork Hugging Face Space (CPU) that loads a quantized GGUF model with [Text Generation WebUI](https://github.com/oobabooga/text-generation-webui) or [llama.cpp server](https://github.com/ggerganov/llama.cpp/tree/master/examples/server). CPU-only is slow but free.
3. **Caching:** Store prompt templates and generated prompts in Firestore/Supabase so learners see reused prompts instantly without model calls.

## Feature Breakdown (MVP)
1. **Prompt Selection**
   - Static JSON of prompts tagged by CEFR level and genre.
   - Optional: script using LLM to expand prompts offline and commit results.

2. **Writing Workspace**
   - Chat-style interface built with SvelteKit + Tailwind (both free).
   - Autosave drafts to browser `localStorage` to reduce backend dependency.

3. **Feedback Pipeline**
   - Submit text to backend function.
   - Backend orchestrator: call LanguageTool for deterministic grammar/spell corrections; call local/hosted LLM for holistic feedback; merge results into structured JSON.
   - Return feedback grouped as: Errors, Style Suggestions, Vocabulary Tips, Positive Reinforcement.

4. **Progress Tracking**
   - Anonymous user IDs stored in Supabase/Firebase.
   - Basic metrics (word count, error count) saved to free-tier database; export CSV manually for deeper analysis.

## Cost Management Tips
- **Automated sleep:** For Spaces/Workers, ensure the app can cold-start; accept small delays instead of keeping warm instances.
- **Batch processing:** Encourage users to submit text in paragraphs to reduce long single inference calls.
- **Monitoring:** Add simple logging to track inference time; if hitting limits, rotate prompts or schedule offline batch feedback.
- **Open-source only:** Avoid SaaS dependencies with usage-based pricing (e.g., no proprietary grammar APIs).

## Roadmap
1. **Week 1:** Scaffold repo, static prompts, client-side mock feedback for UI testing.
2. **Week 2:** Integrate LanguageTool + local Ollama pipeline; finalize structured JSON schema.
3. **Week 3:** Deploy to Cloudflare Pages (frontend) and set up Supabase/Firebase for storage.
4. **Week 4:** Package Hugging Face Space fallback, add progress dashboard, document setup for community contributors.

## Development Setup
```bash
# Install dependencies
npm install

# Run SvelteKit dev server
npm run dev -- --open

# Start local LanguageTool (Java)
java -jar languagetool-server.jar -p 8010

# Run local inference via Ollama
ollama pull phi3
OLLAMA_NUM_PARALLEL=1 ollama run phi3 < prompts/prompt.txt
```

## License
MIT License (to be added) — keeps the project accessible for community contributions.
