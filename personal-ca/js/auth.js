// ============================================
// auth.js — Login, password, session logic
// ============================================

const AUTH_KEY = 'passwordHash';
const HINT_KEY = 'passwordHint';
const DEFAULT_PASSWORD = '5656';

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('loginForm')) {
    await ensureDefaultPassword();
    bindLoginForm();
  }
});

function bindLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const toggleBtn = document.getElementById('togglePassword');
  const errorBox = document.getElementById('loginError');
  const forgotLink = document.getElementById('forgotPasswordLink');
  const hintPanel = document.getElementById('hintPanel');
  const hintText = document.getElementById('hintText');
  const closeHintBtn = document.getElementById('closeHint');

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const hintRecord = await PersonalCA_DB.get(PersonalCA_DB.STORES.AUTH, HINT_KEY);
    hintText.textContent = hintRecord && hintRecord.value ? hintRecord.value : 'No hint has been set yet. Set one in Settings after logging in.';
    hintPanel.classList.remove('hidden');
  });

  closeHintBtn.addEventListener('click', () => hintPanel.classList.add('hidden'));

  let failedAttempts = 0;
  const MAX_ATTEMPTS = 5;
  const COOLDOWN_MS = 30000;
  let cooldownActive = false;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cooldownActive) {
      showError('Too many attempts. Please wait 30 seconds and try again.');
      return;
    }

    const entered = passwordInput.value;
    const storedHash = await PersonalCA_DB.get(PersonalCA_DB.STORES.AUTH, AUTH_KEY);
    const enteredHash = await PersonalCA_Utils.hashPassword(entered);

    if (storedHash && enteredHash === storedHash.value) {
      failedAttempts = 0;
      sessionStorage.setItem('personalCA_loggedIn', 'true');
      window.location.href = 'dashboard.html';
    } else {
      failedAttempts++;
      showError('Incorrect password. Please try again.');
      if (failedAttempts >= MAX_ATTEMPTS) {
        cooldownActive = true;
        showError('Too many failed attempts. Locked for 30 seconds.');
        setTimeout(() => { cooldownActive = false; failedAttempts = 0; }, COOLDOWN_MS);
      }
    }
    passwordInput.value = '';
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    setTimeout(() => errorBox.classList.add('hidden'), 4000);
  }
}

async function ensureDefaultPassword() {
  const existing = await PersonalCA_DB.get(PersonalCA_DB.STORES.AUTH, AUTH_KEY);
  if (!existing) {
    const hash = await PersonalCA_Utils.hashPassword(DEFAULT_PASSWORD);
    await PersonalCA_DB.put(PersonalCA_DB.STORES.AUTH, { key: AUTH_KEY, value: hash });
  }
}

function requireAuth() {
  if (sessionStorage.getItem('personalCA_loggedIn') !== 'true') {
    window.location.href = 'index.html';
  }
}

function logout() {
  sessionStorage.removeItem('personalCA_loggedIn');
  window.location.href = 'index.html';
}

window.PersonalCA_Auth = { requireAuth, logout };
