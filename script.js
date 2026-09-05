/* ============================================================
   NEXUS WEBSITE — script.js
   Frontend logic: navigation, animations, and the connection
   between the contact form and your Google Apps Script backend.
   ============================================================ */

/* ============================================================
   1. CONFIGURATION  —  THE ONLY LINE YOU MUST EDIT
   ------------------------------------------------------------
   After deploying the Apps Script Web App (see README.md),
   paste its URL below. It looks like:
   https://script.google.com/macros/s/AKfycb.../exec
   ============================================================ */
const CONFIG = {
  SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
  REQUEST_TIMEOUT_MS: 20000
};

/* ============================================================
   2. DOM REFERENCES
   ============================================================ */
const navbar = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id], header[id]");
const revealEls = document.querySelectorAll(".reveal");
const statNumbers = document.querySelectorAll(".stat-number");
const contactForm = document.getElementById("contact-form");
const submitBtn = document.getElementById("submit-btn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoader = submitBtn.querySelector(".btn-loader");
const formNote = document.getElementById("form-note");
const toast = document.getElementById("toast");
const yearEl = document.getElementById("year");

/* ============================================================
   3. NAVBAR — scroll state + hamburger + active link
   ============================================================ */
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

hamburger.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("active");
  hamburger.classList.toggle("active", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
});

// Close mobile menu when a link is clicked
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("active");
    hamburger.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
  });
});

// Highlight the nav link of the section in view
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute("id");
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      });
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => navObserver.observe(s));

/* ============================================================
   4. SCROLL REVEAL ANIMATION
   ============================================================ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealEls.forEach((el) => revealObserver.observe(el));

/* ============================================================
   5. ANIMATED STAT COUNTERS
   ============================================================ */
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // ease-out curve for a natural finish
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);
statNumbers.forEach((el) => statObserver.observe(el));

/* ============================================================
   6. TOAST NOTIFICATIONS
   ============================================================ */
let toastTimer = null;

function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 4200);
}

/* ============================================================
   7. FORM VALIDATION
   ============================================================ */
function setError(field, message) {
  const input = contactForm.querySelector(`#${field}`);
  const errorEl = contactForm.querySelector(`[data-error-for="${field}"]`);
  if (input) input.classList.toggle("invalid", Boolean(message));
  if (errorEl) errorEl.textContent = message || "";
}

function validateForm(data) {
  let ok = true;

  if (!data.name || data.name.trim().length < 2) {
    setError("name", "Please enter your name (at least 2 characters).");
    ok = false;
  } else setError("name", "");

  if (!data.email) {
    setError("email", "Please enter your email address.");
    ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    setError("email", "Please enter a valid email address.");
    ok = false;
  } else setError("email", "");

  if (!data.message || data.message.trim().length < 10) {
    setError("message", "Message must be at least 10 characters long.");
    ok = false;
  } else setError("message", "");

  return ok;
}

/* ============================================================
   8. SUBMIT FORM  →  GOOGLE APPS SCRIPT BACKEND
   ------------------------------------------------------------
   We send the request with Content-Type "text/plain" so the
   browser skips the CORS preflight — this is the standard,
   reliable pattern for Apps Script Web Apps.
   ============================================================ */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.textContent = isLoading ? "Sending..." : "Send Message";
  btnLoader.hidden = !isLoading;
}

async function sendToAppsScript(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });

    const raw = await response.text();
    try {
      return JSON.parse(raw);
    } catch {
      // Apps Script sometimes wraps responses; if we got HTTP 200
      // with non-JSON we still treat it as delivered.
      return response.ok
        ? { success: true, message: "Message received." }
        : { success: false, message: `Server error (HTTP ${response.status}).` };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: contactForm.name.value.trim(),
    email: contactForm.email.value.trim(),
    subject: contactForm.subject.value.trim(),
    message: contactForm.message.value.trim(),
    page: location.href,
    submittedAt: new Date().toISOString()
  };

  if (!validateForm(data)) {
    showToast("Please fix the highlighted fields.", "error");
    return;
  }

  // Demo mode: backend URL not configured yet
  if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.includes("PASTE_YOUR")) {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Demo mode: paste your Apps Script URL in script.js to go live.", "error");
      formNote.textContent = "Backend not connected yet — see README.md step 5.";
      formNote.className = "form-note error";
    }, 900);
    return;
  }

  try {
    setLoading(true);
    formNote.textContent = "";
    const result = await sendToAppsScript(data);

    if (result && result.success) {
      showToast(result.message || "Message sent successfully!", "success");
      formNote.textContent = result.message || "Thank you! Your message has been received.";
      formNote.className = "form-note success";
      contactForm.reset();
    } else {
      throw new Error(result && result.message ? result.message : "Unknown server error.");
    }
  } catch (err) {
    const msg = err.name === "AbortError"
      ? "Request timed out. Please check your connection and try again."
      : (err.message || "Something went wrong. Please try again.");
    showToast(msg, "error");
    formNote.textContent = msg;
    formNote.className = "form-note error";
  } finally {
    setLoading(false);
  }
});

/* Clear error state while typing */
["name", "email", "message"].forEach((field) => {
  contactForm[field].addEventListener("input", () => setError(field, ""));
});

/* ============================================================
   9. FOOTER YEAR
   ============================================================ */
yearEl.textContent = new Date().getFullYear();
