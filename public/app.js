/* ── State ─────────────────────────────────────────────────────────────────── */
let token = localStorage.getItem('wc_token');
let currentUser = localStorage.getItem('wc_user');
let allMatches = [];
let myPredictions = {};  // matchId -> prediction
let currentMatchId = null;

/* ── Init ──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadStats();
  loadMatches();

  if (currentUser) {
    loadMyPredictions();
  }
});

/* ── API Helper ────────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

/* ── Auth UI ───────────────────────────────────────────────────────────────── */
function updateAuthUI() {
  const userInfo = document.getElementById('user-info');
  const authBtns = document.getElementById('auth-buttons');
  const userNameEl = document.getElementById('user-name');
  const userAvatarEl = document.getElementById('user-avatar');

  if (currentUser) {
    userInfo.classList.remove('hidden');
    authBtns.classList.add('hidden');
    userNameEl.textContent = currentUser;
    userAvatarEl.textContent = currentUser[0].toUpperCase();
  } else {
    userInfo.classList.add('hidden');
    authBtns.classList.remove('hidden');
  }
}

function saveAuth(t, u) {
  token = t;
  currentUser = u;
  localStorage.setItem('wc_token', t);
  localStorage.setItem('wc_user', u);
  updateAuthUI();
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('wc_token');
  localStorage.removeItem('wc_user');
  myPredictions = {};
  updateAuthUI();
  renderMatches(allMatches);
  showToast('تم تسجيل الخروج', 'success');
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
function openModal(type) {
  document.getElementById('modal-login').classList.toggle('hidden', type !== 'login');
  document.getElementById('modal-register').classList.toggle('hidden', type !== 'register');
  document.getElementById('modal-overlay').classList.add('open');
  clearErrors();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function switchModal(type) {
  document.getElementById('modal-login').classList.toggle('hidden', type !== 'login');
  document.getElementById('modal-register').classList.toggle('hidden', type !== 'register');
  clearErrors();
}

function clearErrors() {
  ['login-error', 'reg-error'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.textContent = '';
  });
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function login(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'جاري الدخول...';

  try {
    const data = await api('POST', '/auth/login', { username, password });
    saveAuth(data.token, data.username);
    closeModal();
    showToast('مرحباً ' + data.username + '! 🎉', 'success');
    await loadMyPredictions();
    renderMatches(allMatches);
    if (document.getElementById('page-leaderboard').classList.contains('active')) {
      loadLeaderboard();
    }
  } catch (err) {
    showFormError('login-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'دخول';
  }
}

async function register(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-submit');
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (password !== confirm) {
    return showFormError('reg-error', 'كلمة المرور غير متطابقة');
  }

  btn.disabled = true;
  btn.textContent = 'جاري الإنشاء...';

  try {
    const data = await api('POST', '/auth/register', { username, password });
    saveAuth(data.token, data.username);
    closeModal();
    showToast('تم إنشاء حسابك بنجاح! 🎉', 'success');
    await loadMyPredictions();
    renderMatches(allMatches);
  } catch (err) {
    showFormError('reg-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'إنشاء الحساب';
  }
}

/* ── Stats ─────────────────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const data = await api('GET', '/stats');
    document.getElementById('stat-users').textContent = data.totalUsers.toLocaleString('ar');
    document.getElementById('stat-predictions').textContent = data.totalPredictions.toLocaleString('ar');
    document.getElementById('stat-matches').textContent = data.finishedMatches.toLocaleString('ar');
  } catch (_) {}
}

/* ── Matches ───────────────────────────────────────────────────────────────── */
async function loadMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';

  try {
    allMatches = await api('GET', '/matches');
    populateGroupFilter();
    renderMatches(allMatches);
  } catch (err) {
    container.innerHTML = '<div class="loading">فشل تحميل المباريات</div>';
  }
}

function populateGroupFilter() {
  const select = document.getElementById('group-filter');
  const groups = [...new Set(allMatches.filter(m => m.group_key).map(m => m.group_key))];
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = `المجموعة ${g}`;
    select.appendChild(opt);
  });
}

function filterMatches() {
  const stage = document.getElementById('stage-filter').value;
  const groupKey = document.getElementById('group-filter').value;

  let filtered = allMatches;
  if (stage) filtered = filtered.filter(m => m.stage === stage);
  if (groupKey) filtered = filtered.filter(m => m.group_key === groupKey);

  renderMatches(filtered);
}

function renderMatches(matches) {
  const container = document.getElementById('matches-container');
  if (!matches.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>لا توجد مباريات</p></div>';
    return;
  }

  // Group by group/stage
  const sections = {};
  matches.forEach(m => {
    const key = m.group_name || m.stage;
    if (!sections[key]) sections[key] = [];
    sections[key].push(m);
  });

  container.innerHTML = Object.entries(sections).map(([label, sMatches]) => `
    <div class="group-section">
      <div class="group-label">⚽ ${label}</div>
      ${sMatches.map(renderMatchCard).join('')}
    </div>
  `).join('');
}

function renderMatchCard(match) {
  const myPred = myPredictions[match.id];
  const isFinished = match.status === 'finished';
  const isPast = new Date(match.match_date) < new Date();
  const isTBD = match.home_team === 'TBD';

  const dateStr = formatDate(match.match_date);

  let scoreDisplay = '';
  if (isFinished) {
    scoreDisplay = `<div class="match-score-display">${match.home_score} - ${match.away_score}</div>`;
  } else {
    scoreDisplay = `<div class="match-vs">VS</div>`;
  }

  let statusBadge = '';
  if (isFinished) statusBadge = '<span class="match-status-badge badge-finished">انتهت</span>';
  else if (isPast) statusBadge = '<span class="match-status-badge badge-live">جارية</span>';
  else statusBadge = '<span class="match-status-badge badge-upcoming">قادمة</span>';

  let actionBtn = '';
  if (isTBD) {
    actionBtn = `<button class="predict-btn" disabled>سيُحدد لاحقاً</button>`;
  } else if (isFinished) {
    actionBtn = `<button class="predict-btn" disabled>انتهت المباراة</button>`;
  } else if (!currentUser) {
    actionBtn = `<button class="predict-btn" onclick="openModal('login')">🔐 سجّل للتوقع</button>`;
  } else if (isPast) {
    actionBtn = `<button class="predict-btn" disabled>انتهى وقت التوقع</button>`;
  } else if (myPred) {
    actionBtn = `<button class="predict-btn predicted" onclick="openPredModal(${match.id})">✏️ تعديل التوقع</button>`;
  } else {
    actionBtn = `<button class="predict-btn" onclick="openPredModal(${match.id})">+ أضف توقعك</button>`;
  }

  let predTag = '';
  if (myPred) {
    predTag = `<div class="user-prediction-tag">توقعك: ${myPred.home_score} - ${myPred.away_score}</div>`;
  }

  return `
    <div class="match-card ${match.status}">
      <div class="match-team">
        <div class="team-flag">${match.home_flag}</div>
        <div class="team-name">${match.home_team_ar}</div>
        <div class="team-name-en">${match.home_team}</div>
      </div>
      <div class="match-center">
        <div class="match-date-str">${dateStr}</div>
        ${scoreDisplay}
        ${statusBadge}
        <div class="match-actions">
          ${actionBtn}
          ${predTag}
        </div>
      </div>
      <div class="match-team away">
        <div class="team-flag">${match.away_flag}</div>
        <div class="team-name">${match.away_team_ar}</div>
        <div class="team-name-en">${match.away_team}</div>
      </div>
    </div>
  `;
}

/* ── My Predictions ────────────────────────────────────────────────────────── */
async function loadMyPredictions() {
  if (!currentUser) return;
  try {
    const preds = await api('GET', '/predictions/me');
    myPredictions = {};
    preds.forEach(p => { myPredictions[p.match_id] = p; });
  } catch (_) {}
}

function renderMyPredictions() {
  const container = document.getElementById('predictions-container');
  const preds = Object.values(myPredictions);

  if (!preds.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>لم تقم بأي توقعات بعد</p>
        <button class="btn btn-primary" onclick="showPage('matches')">ابدأ التوقع</button>
      </div>`;
    return;
  }

  const sorted = preds.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  const html = sorted.map(p => {
    const pts = p.points_earned;
    const ptsClass = pts === null ? 'pending' : pts === 5 ? 'pts-5' : pts === 1 ? 'pts-1' : 'pts-0';
    let ptsBadge;
    if (pts === null) {
      ptsBadge = `<div class="pts-badge pending"><span>⏳</span><div class="pts-label">قيد الانتظار</div></div>`;
    } else {
      ptsBadge = `<div class="pts-badge ${ptsClass}"><span>${pts}</span><div class="pts-label">نقطة</div></div>`;
    }

    const matchResult = p.match_home_score !== null
      ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">النتيجة: ${p.match_home_score} - ${p.match_away_score}</div>`
      : '';

    return `
      <div class="pred-card ${ptsClass}">
        <div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:4px">${p.group_name} • ${formatDate(p.match_date)}</div>
          <div style="font-weight:800;font-size:.95rem">${p.home_team_ar} vs ${p.away_team_ar}</div>
          ${matchResult}
        </div>
        <div>
          <div class="pred-score-display">${p.home_score} - ${p.away_score}</div>
          <div class="pred-label">توقعك</div>
        </div>
        <div></div>
        ${ptsBadge}
      </div>`;
  }).join('');

  const totalPts = sorted.reduce((s, p) => s + (p.points_earned || 0), 0);
  const exact = sorted.filter(p => p.points_earned === 5).length;
  const correct = sorted.filter(p => p.points_earned === 1).length;

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,var(--green-dark),var(--green));border-radius:var(--radius);padding:24px;margin-bottom:24px;color:#fff;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center">
      <div>
        <div style="font-size:2rem;font-weight:900;color:var(--gold)">${totalPts}</div>
        <div style="font-size:.85rem;opacity:.8">مجموع النقاط</div>
      </div>
      <div>
        <div style="font-size:2rem;font-weight:900">${sorted.length}</div>
        <div style="font-size:.85rem;opacity:.8">توقع</div>
      </div>
      <div>
        <div style="font-size:2rem;font-weight:900">🎯 ${exact}</div>
        <div style="font-size:.85rem;opacity:.8">نتيجة صحيحة</div>
      </div>
    </div>
    <div class="predictions-list">${html}</div>`;
}

/* ── Prediction Modal ──────────────────────────────────────────────────────── */
function openPredModal(matchId) {
  if (!currentUser) { openModal('login'); return; }

  const match = allMatches.find(m => m.id === matchId);
  if (!match) return;

  currentMatchId = matchId;
  const existing = myPredictions[matchId];

  document.getElementById('pm-stage').textContent = match.group_name;
  document.getElementById('pm-date').textContent = formatDate(match.match_date);
  document.getElementById('pm-home').textContent = match.home_team_ar;
  document.getElementById('pm-away').textContent = match.away_team_ar;
  document.getElementById('pm-home-flag').textContent = match.home_flag;
  document.getElementById('pm-away-flag').textContent = match.away_flag;
  document.getElementById('pred-home-score').value = existing ? existing.home_score : 0;
  document.getElementById('pred-away-score').value = existing ? existing.away_score : 0;

  const predErr = document.getElementById('pred-error');
  predErr.classList.add('hidden');

  document.getElementById('pred-modal-overlay').classList.add('open');
}

function closePredModal() {
  document.getElementById('pred-modal-overlay').classList.remove('open');
  currentMatchId = null;
}

function changeScore(side, delta) {
  const input = document.getElementById(`pred-${side}-score`);
  const newVal = Math.max(0, Math.min(20, parseInt(input.value || 0) + delta));
  input.value = newVal;
}

async function submitPrediction() {
  if (!currentMatchId) return;

  const homeScore = parseInt(document.getElementById('pred-home-score').value);
  const awayScore = parseInt(document.getElementById('pred-away-score').value);

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    document.getElementById('pred-error').textContent = 'يرجى إدخال نتيجة صحيحة';
    document.getElementById('pred-error').classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('pred-submit');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
    await api('POST', '/predictions', {
      match_id: currentMatchId,
      home_score: homeScore,
      away_score: awayScore,
    });

    // Update local state
    const match = allMatches.find(m => m.id === currentMatchId);
    myPredictions[currentMatchId] = {
      match_id: currentMatchId,
      home_score: homeScore,
      away_score: awayScore,
      points_earned: null,
      home_team_ar: match.home_team_ar,
      away_team_ar: match.away_team_ar,
      home_flag: match.home_flag,
      away_flag: match.away_flag,
      match_date: match.match_date,
      group_name: match.group_name,
      match_status: match.status,
    };

    closePredModal();
    renderMatches(allMatches);
    showToast('✅ تم حفظ توقعك بنجاح!', 'success');
    loadStats();
  } catch (err) {
    document.getElementById('pred-error').textContent = err.message;
    document.getElementById('pred-error').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ التوقع';
  }
}

/* ── Leaderboard ───────────────────────────────────────────────────────────── */
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';

  try {
    const users = await api('GET', '/leaderboard');
    renderLeaderboard(users);
  } catch {
    container.innerHTML = '<div class="loading">فشل التحميل</div>';
  }
}

function renderLeaderboard(users) {
  const container = document.getElementById('leaderboard-container');
  if (!users.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🏆</span>
        <p>لا يوجد لاعبون بعد. كن أول من يتوقع!</p>
        <button class="btn btn-primary" onclick="showPage('matches')">ابدأ الآن</button>
      </div>`;
    return;
  }

  const rankIcon = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return i + 1;
  };
  const rankClass = (i) => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

  const rows = users.map((u, i) => {
    const isMe = u.username === currentUser;
    return `
      <div class="lb-row">
        <div class="lb-rank ${rankClass(i)}">${rankIcon(i)}</div>
        <div class="lb-user">
          <div class="lb-avatar ${rankClass(i)}">${u.username[0].toUpperCase()}</div>
          <div class="lb-username ${isMe ? 'me' : ''}">${u.username}${isMe ? ' (أنت)' : ''}</div>
        </div>
        <div class="lb-points" style="color:var(--green-dark)">${u.points}</div>
        <div class="lb-stat lb-stat-green">🎯 ${u.exact_scores || 0}</div>
        <div class="lb-stat">✅ ${u.correct_results || 0}</div>
        <div class="lb-stat">📋 ${u.total_predictions || 0}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="leaderboard-table">
      <div class="lb-row lb-header">
        <div style="text-align:center">#</div>
        <div>اللاعب</div>
        <div style="text-align:center">النقاط</div>
        <div style="text-align:center">نتائج صحيحة</div>
        <div style="text-align:center">فائز صحيح</div>
        <div style="text-align:center">التوقعات</div>
      </div>
      ${rows}
    </div>`;
}

/* ── Navigation ────────────────────────────────────────────────────────────── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');

  if (name === 'leaderboard') loadLeaderboard();
  if (name === 'predictions') {
    if (!currentUser) {
      document.getElementById('predictions-container').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔐</span>
          <p>سجّل دخولك لمشاهدة توقعاتك</p>
          <button class="btn btn-primary" onclick="openModal('login')">دخول</button>
        </div>`;
    } else {
      renderMyPredictions();
    }
  }
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
