import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.supabaseConfig || {};

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn(
    "Supabase configuration is missing. Create a supabase-config.js file based on supabase-config.example.js."
  );
}

export const supabase =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true },
      })
    : null;

const storageBucket = config.storageBucket || "writercoach-submissions";
const state = {
  session: null,
  lastDigestUrl: "",
};

window.supabase = supabase;

const modal = document.getElementById("auth-modal");
const form = document.getElementById("magic-link-form");
const emailInput = document.getElementById("auth-email-input");
const submitButton = document.getElementById("magic-link-submit");
const messageEl = document.getElementById("auth-message");
const authEmail = document.getElementById("auth-email");
const signOutButton = document.getElementById("sign-out-button");
const openButtons = document.querySelectorAll('[data-action="open-auth"]');
const closeElements = document.querySelectorAll('[data-action="close-auth"]');

const assignmentsList = document.getElementById("assignments-list");
const assignmentsEmpty = document.getElementById("assignments-empty");
const assignmentsStatus = document.getElementById("assignments-status");
const assignmentSelect = document.getElementById("assignment-select");

const submissionsList = document.getElementById("submissions-list");
const submissionsEmpty = document.getElementById("submissions-empty");
const submissionsStatus = document.getElementById("submissions-status");

const feedbackList = document.getElementById("feedback-list");
const feedbackEmpty = document.getElementById("feedback-empty");
const feedbackStatus = document.getElementById("feedback-status");

const submissionForm = document.getElementById("submission-form");
const submissionStatus = document.getElementById("submission-status");
const draftFileInput = document.getElementById("draft-file");
const transcriptFileInput = document.getElementById("transcript-file");
const reflectionInput = document.getElementById("reflection-input");
const timeInput = document.getElementById("time-input");

const digestButton = document.getElementById("generate-digest");
const copyDigestButton = document.getElementById("copy-digest");
const digestOutput = document.getElementById("digest-output");
const digestStatus = document.getElementById("digest-status");

function setMessage(text = "", status) {
  if (!messageEl) return;
  if (status) {
    messageEl.dataset.status = status;
  } else {
    delete messageEl.dataset.status;
  }
  messageEl.textContent = text;
}

function setStatusBadge(el, text, status) {
  if (!el) return;
  el.textContent = text;
  if (status) {
    el.dataset.status = status;
  } else {
    delete el.dataset.status;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderAuthState(session) {
  state.session = session;
  const authState = session ? "signed-in" : "signed-out";
  document.body.dataset.auth = authState;
  if (authEmail) {
    authEmail.textContent = session?.user?.email || "";
  }
  if (!session) {
    resetDashboard();
  }
}

async function handleMagicLinkSubmit(event) {
  event.preventDefault();
  if (!form || !emailInput || !submitButton) return;

  const email = emailInput.value.trim();
  if (!email) {
    setMessage("Please enter your email address.", "error");
    return;
  }

  if (!supabase) {
    setMessage("Supabase is not configured for this environment.", "error");
    return;
  }

  submitButton.disabled = true;
  setMessage("Sending magic link...");

  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      throw error;
    }
    setMessage("Check your email for the sign-in link.", "success");
    form.reset();
    setTimeout(() => {
      closeAuthModal();
    }, 1600);
  } catch (error) {
    console.error("Failed to send magic link", error);
    setMessage(
      error.message || "We could not send the magic link. Please try again.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
}

async function handleSignOut() {
  if (!supabase || !signOutButton) return;
  signOutButton.disabled = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setMessage("You have been signed out.", "success");
  } catch (error) {
    console.error("Failed to sign out", error);
    setMessage(error.message || "Unable to sign out.", "error");
  } finally {
    signOutButton.disabled = false;
  }
}

function resetDashboard() {
  [assignmentsList, submissionsList, feedbackList].forEach((list) => {
    if (list) list.innerHTML = "";
  });
  [assignmentsEmpty, submissionsEmpty, feedbackEmpty].forEach((el) => {
    if (el) el.hidden = true;
  });
  if (assignmentSelect) {
    assignmentSelect.innerHTML = '<option value="">Choose an assignment</option>';
  }
  setStatusBadge(assignmentsStatus, "Idle");
  setStatusBadge(submissionsStatus, "Idle");
  setStatusBadge(feedbackStatus, "Idle");
  setStatusBadge(submissionStatus, "Waiting");
  setStatusBadge(digestStatus, "Idle");
  if (digestOutput) digestOutput.textContent = "";
  if (copyDigestButton) copyDigestButton.disabled = true;
  state.lastDigestUrl = "";
}

function openAuthModal() {
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setMessage();
  if (emailInput) {
    emailInput.focus();
  }
}

function closeAuthModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  form?.reset();
  setMessage();
}

function renderAssignments(assignments = []) {
  if (!assignmentsList || !assignmentsEmpty) return;
  assignmentsList.innerHTML = "";
  assignmentsEmpty.hidden = assignments.length > 0;

  if (assignmentSelect) {
    assignmentSelect.innerHTML = '<option value="">Choose an assignment</option>';
  }

  assignments.forEach((assignment) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <h4>${assignment.title}</h4>
      <p>${assignment.instructions || "No instructions provided yet."}</p>
      <div class="meta-row">
        <span class="pill">Due ${formatDate(assignment.due_date)}</span>
      </div>
    `;
    assignmentsList.appendChild(li);

    if (assignmentSelect) {
      const option = document.createElement("option");
      option.value = assignment.id;
      option.textContent = assignment.title;
      assignmentSelect.appendChild(option);
    }
  });
}

function renderSubmissions(submissions = []) {
  if (!submissionsList || !submissionsEmpty) return;
  submissionsList.innerHTML = "";
  submissionsEmpty.hidden = submissions.length > 0;

  submissions.forEach((submission) => {
    const li = document.createElement("li");
    const assignmentTitle = submission.assignments?.title || "Assignment";
    li.innerHTML = `
      <h4>${assignmentTitle}</h4>
      <p>${submission.reflection || "No reflection added."}</p>
      <div class="meta-row">
        <span class="pill">Submitted ${formatDateTime(submission.submitted_at)}</span>
        ${
          submission.word_count
            ? `<span class="pill">${submission.word_count} words</span>`
            : ""
        }
        ${
          submission.time_spent_minutes
            ? `<span class="pill">${submission.time_spent_minutes} mins</span>`
            : ""
        }
      </div>
      <div class="meta-row">
        ${
          submission.draft_url
            ? `<a href="${submission.draft_url}" target="_blank" rel="noreferrer">Draft file</a>`
            : ""
        }
        ${
          submission.transcript_url
            ? `<a href="${submission.transcript_url}" target="_blank" rel="noreferrer">Transcript</a>`
            : ""
        }
      </div>
    `;
    submissionsList.appendChild(li);
  });
}

function renderFeedback(feedback = []) {
  if (!feedbackList || !feedbackEmpty) return;
  feedbackList.innerHTML = "";
  feedbackEmpty.hidden = feedback.length > 0;

  feedback.forEach((item) => {
    const li = document.createElement("li");
    const rubric =
      typeof item.rubric_scores === "object"
        ? JSON.stringify(item.rubric_scores, null, 2)
        : item.rubric_scores;
    li.innerHTML = `
      <h4>${item.author_role || "Teacher"}</h4>
      <p>${item.comment || "No comment provided."}</p>
      ${
        rubric
          ? `<pre class="digest-output" aria-label="Rubric scores">${rubric}</pre>`
          : ""
      }
      <div class="meta-row">
        <span class="pill">${formatDateTime(item.created_at)}</span>
        ${
          item.submissions?.assignments?.title
            ? `<span class="pill">${item.submissions.assignments.title}</span>`
            : ""
        }
      </div>
    `;
    feedbackList.appendChild(li);
  });
}

async function loadAssignments() {
  if (!supabase || !state.session) return;
  setStatusBadge(assignmentsStatus, "Loading…", "loading");
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select("id, title, instructions, due_date")
      .order("due_date", { ascending: true });

    if (error) throw error;
    renderAssignments(data || []);
    setStatusBadge(assignmentsStatus, "Synced", "success");
  } catch (error) {
    console.error("Failed to load assignments", error);
    setStatusBadge(assignmentsStatus, "Error", "error");
    if (assignmentsEmpty) {
      assignmentsEmpty.hidden = false;
      assignmentsEmpty.textContent = "Unable to fetch assignments.";
    }
  }
}

async function loadSubmissions() {
  if (!supabase || !state.session) return;
  setStatusBadge(submissionsStatus, "Loading…", "loading");
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "id, assignment_id, submitted_at, word_count, draft_url, transcript_url, reflection, time_spent_minutes, assignments (title)"
      )
      .eq("student_id", state.session.user.id)
      .order("submitted_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    renderSubmissions(data || []);
    setStatusBadge(submissionsStatus, "Synced", "success");
  } catch (error) {
    console.error("Failed to load submissions", error);
    setStatusBadge(submissionsStatus, "Error", "error");
    if (submissionsEmpty) {
      submissionsEmpty.hidden = false;
      submissionsEmpty.textContent = "Unable to fetch submissions.";
    }
  }
}

async function loadFeedback() {
  if (!supabase || !state.session) return;
  setStatusBadge(feedbackStatus, "Loading…", "loading");
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select(
        "id, submission_id, author_role, comment, rubric_scores, created_at, submissions (assignments (title))"
      )
      .eq("student_id", state.session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    renderFeedback(data || []);
    setStatusBadge(feedbackStatus, "Synced", "success");
  } catch (error) {
    console.error("Failed to load feedback", error);
    setStatusBadge(feedbackStatus, "Error", "error");
    if (feedbackEmpty) {
      feedbackEmpty.hidden = false;
      feedbackEmpty.textContent = "Unable to fetch feedback.";
    }
  }
}

async function uploadFile(file, prefix) {
  if (!supabase || !file) return null;
  const filename = `${state.session.user.id}/${prefix}-${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .upload(filename, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(storageBucket).getPublicUrl(data.path);
  return urlData?.publicUrl || null;
}

async function handleSubmission(event) {
  event.preventDefault();
  if (!supabase || !state.session) {
    setStatusBadge(submissionStatus, "Not connected", "error");
    return;
  }

  const assignmentId = assignmentSelect?.value;
  const draftFile = draftFileInput?.files?.[0];
  const transcriptFile = transcriptFileInput?.files?.[0];

  if (!assignmentId || !draftFile) {
    setStatusBadge(submissionStatus, "Missing fields", "error");
    return;
  }

  const submitBtn = submissionForm?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  setStatusBadge(submissionStatus, "Uploading…", "loading");

  try {
    const [draftUrl, transcriptUrl] = await Promise.all([
      uploadFile(draftFile, "draft"),
      uploadFile(transcriptFile, "transcript"),
    ]);

    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      student_id: state.session.user.id,
      reflection: reflectionInput?.value || null,
      time_spent_minutes: timeInput?.value ? Number(timeInput.value) : null,
      draft_url: draftUrl,
      transcript_url: transcriptUrl,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    if (error) throw error;
    setStatusBadge(submissionStatus, "Saved", "success");
    submissionForm?.reset();
    await Promise.all([loadSubmissions(), loadFeedback()]);
  } catch (error) {
    console.error("Failed to create submission", error);
    setStatusBadge(submissionStatus, "Error", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function generateDigest() {
  if (!supabase || !state.session) {
    setStatusBadge(digestStatus, "Not connected", "error");
    return;
  }

  setStatusBadge(digestStatus, "Requesting…", "loading");
  if (digestOutput) digestOutput.textContent = "";
  if (copyDigestButton) copyDigestButton.disabled = true;

  try {
    const { data, error } = await supabase.functions.invoke("progress_digest", {
      body: { student_id: state.session.user.id },
    });
    if (error) throw error;
    const digest = data?.digest || data;
    const link = data?.signed_url || "";
    state.lastDigestUrl = link;
    if (digestOutput) {
      digestOutput.textContent = JSON.stringify(digest, null, 2);
    }
    if (copyDigestButton) {
      copyDigestButton.disabled = !link;
    }
    setStatusBadge(digestStatus, link ? "Signed URL ready" : "Digest ready", "success");
    if (link && digestOutput) {
      digestOutput.textContent += `\n\nSigned URL:\n${link}`;
    }
  } catch (error) {
    console.error("Failed to generate digest", error);
    setStatusBadge(digestStatus, "Error", "error");
    if (digestOutput) {
      digestOutput.textContent = error.message || "Unable to generate digest.";
    }
  }
}

async function copyDigest() {
  if (!state.lastDigestUrl) return;
  try {
    await navigator.clipboard.writeText(state.lastDigestUrl);
    setStatusBadge(digestStatus, "Copied", "success");
  } catch (error) {
    console.error("Failed to copy digest link", error);
    setStatusBadge(digestStatus, "Copy failed", "error");
  }
}

function attachEventListeners() {
  openButtons.forEach((button) => {
    button.addEventListener("click", openAuthModal);
  });

  closeElements.forEach((el) => {
    el.addEventListener("click", closeAuthModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) {
      closeAuthModal();
    }
  });

  form?.addEventListener("submit", handleMagicLinkSubmit);
  signOutButton?.addEventListener("click", handleSignOut);
  submissionForm?.addEventListener("submit", handleSubmission);
  digestButton?.addEventListener("click", generateDigest);
  copyDigestButton?.addEventListener("click", copyDigest);
}

async function handleSessionChange(session) {
  renderAuthState(session);
  if (session && supabase) {
    await Promise.all([loadAssignments(), loadSubmissions(), loadFeedback()]);
  }
}

async function initialiseSession() {
  if (!supabase) {
    renderAuthState(null);
    return;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await handleSessionChange(session);
  } catch (error) {
    console.error("Failed to fetch session", error);
    renderAuthState(null);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    handleSessionChange(session);
  });
}

function init() {
  if (!document.body.dataset.auth) {
    document.body.dataset.auth = "signed-out";
  }

  renderAuthState(null);
  attachEventListeners();
  initialiseSession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

export { openAuthModal, closeAuthModal };
