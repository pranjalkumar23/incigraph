// Placeholder auth gate: fixed credentials, client-side only. Not real security —
// just blocks casual access until the backend's real auth (accounts, orgs, billing)
// replaces this. See backend/README.md for the planned auth/subscription work.
const LOGIN_USERNAME = "Admin";
const LOGIN_PASSWORD = "Pass@123";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    localStorage.setItem("inciAuthed", "1");
    document.documentElement.classList.add("authed");
    loginError.style.display = "none";
  } else {
    loginError.style.display = "block";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("inciAuthed");
  location.reload();
});
