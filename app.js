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
        auth: {
          persistSession: true,
        },
      })
    : null;

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

function setMessage(text = "", status) {
  if (!messageEl) return;
  if (status) {
    messageEl.dataset.status = status;
  } else {
    delete messageEl.dataset.status;
  }
  messageEl.textContent = text;
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

function renderAuthState(session) {
  const state = session ? "signed-in" : "signed-out";
  document.body.dataset.auth = state;
  if (authEmail) {
    authEmail.textContent = session?.user?.email || "";
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
    setMessage(error.message || "We could not send the magic link. Please try again.", "error");
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
    renderAuthState(session);
  } catch (error) {
    console.error("Failed to fetch session", error);
    renderAuthState(null);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    renderAuthState(session);
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
