'use strict';

async function loadBackendConfig() {
  const local = window.DCCN_SUPABASE_CONFIG || {};
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (response.ok) {
      const remote = await response.json();
      return {
        supabaseUrl: remote.supabaseUrl || local.supabaseUrl || '',
        supabasePublishableKey: remote.supabasePublishableKey || local.supabasePublishableKey || ''
      };
    }
  } catch (_) { /* Local static preview may not have the Vercel config function. */ }
  return local;
}
const BACKEND_CONFIG = await loadBackendConfig();
const BACKEND_READY = Boolean(BACKEND_CONFIG.supabaseUrl && BACKEND_CONFIG.supabasePublishableKey);
// Student identities and official attempts are stored server-side in Supabase.
const app = document.getElementById('app');

async function apiCall(action, payload = {}) {
  if (!BACKEND_READY) throw new Error('Supabase is not configured yet. Add the project URL and publishable key before testing sign-in.');
  const response = await fetch(`${BACKEND_CONFIG.supabaseUrl.replace(/\/$/, '')}/functions/v1/quiz-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: BACKEND_CONFIG.supabasePublishableKey
    },
    body: JSON.stringify({ action, ...payload })
  });
  let data;
  try { data = await response.json(); } catch (_) { throw new Error(`Backend returned an unreadable response (${response.status}).`); }
  if (!response.ok || data.error) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}

const state = {
  page: 'home', identity: null, index: 0, answers: {}, route: ['A'], wifiOrder: [],
  packets: [], media: {}, mode: {}, errors: {}, ipv4: ['', '', '', ''], submitted: false,
  showReview: false
};

const QUESTIONS = [
  { title: 'Which picture shows a star topology?', type: 'Visual identification', instruction: 'In a star topology, all computers connect to one central device.', source: 'Module 1.1, slide 27' },
  { title: 'Sort the transmission media', type: 'Sort and classify', instruction: 'Place each medium under the correct category: guided or unguided.', source: 'Module 1.2, slides 5–6 and 17–18' },
  { title: 'Find the Physical Layer', type: 'Tap the layer', instruction: 'Tap the OSI layer that represents bits as electrical or optical signals and uses the transmission medium.', source: 'Module 1.1, slide 72; Module 1.2, slide 3' },
  { title: 'Match the transmission modes', type: 'Match the examples', instruction: 'Choose the mode that best describes each everyday communication example.', source: 'Module 1.1, slides 13–15' },
  { title: 'Identify the error type', type: 'Classify the examples', instruction: 'Match each description to a single-bit error or a burst error.', source: 'Module 2.1, slides 19–20' },
  { title: 'Who forwards the Ethernet frame?', type: 'Tap the network device', instruction: 'In this wired Ethernet LAN, tap the device that checks the destination MAC address and forwards the frame to the appropriate port.', source: 'Module 2.2, slides 15–16' },
  { title: 'Put the Wi-Fi steps in order', type: 'Sequence puzzle', instruction: 'Tap the steps in the order a device uses to send data through a Wi-Fi access point.', source: 'Module 2.3, slide 5' },
  { title: 'Reassemble the message', type: 'Packet puzzle', instruction: 'Packet switching breaks data into smaller packets. Move all three packets into the destination tray to reassemble the message.', source: 'Module 3.1, slides 9–10' },
  { title: 'Find the best route from A to F', type: 'Interactive routing map', instruction: 'Select connected nodes on the map from A to F. Choose the path with the lowest total cost. If two paths have the same cost, choose the one with fewer hops.', source: 'Module 3.2, slides 3–6 and 10; original practice graph created for this quiz' },
  { title: 'Build a valid IPv4 address', type: 'Address builder', instruction: 'Enter four decimal numbers to make an IPv4 dotted-decimal address. Each number must be from 0 to 255. Do not use unnecessary leading zeros.', source: 'Module 3.1, slides 22–23, 40 and 50–51' }
];

const MEDIA_ITEMS = [
  { id: 'twisted', name: 'Twisted-pair cable', detail: 'A pair of insulated copper wires twisted together.' },
  { id: 'coax', name: 'Coaxial cable', detail: 'A cable with an inner and outer conductor.' },
  { id: 'fiber', name: 'Optical-fiber cable', detail: 'Uses thin glass or plastic fibers.' },
  { id: 'radio', name: 'Radio waves', detail: 'Wireless transmission through the air.' }
];
const MODE_ITEMS = [
  { id: 'keyboard', label: 'Keyboard sending input to a computer' },
  { id: 'walkie', label: 'Two people using a walkie-talkie' },
  { id: 'phone', label: 'Two people talking on a telephone' }
];
const ERROR_ITEMS = [
  { id: 'single', title: 'Example A', text: 'Only one bit in the data unit changes from 0 to 1 or from 1 to 0.' },
  { id: 'burst', title: 'Example B', text: 'Two or more bits in the data unit are changed.' }
];
const WIFI_STEPS = [
  { id: 'prepare', text: 'Prepare data in a wireless frame' },
  { id: 'forward', text: 'Access point forwards data to its destination' },
  { id: 'connect', text: 'Connect to the selected network' },
  { id: 'find', text: 'Find the available Wi-Fi network' },
  { id: 'transmit', text: 'Transmit the frame through radio waves' }
];
const WIFI_CHOICES = ['prepare', 'forward', 'connect', 'find', 'transmit'];
const ROUTE_NODES = {
  A: { x: 64, y: 126 }, B: { x: 205, y: 45 }, C: { x: 205, y: 208 },
  D: { x: 376, y: 45 }, E: { x: 376, y: 208 }, F: { x: 545, y: 126 }
};
const ROUTE_EDGES = [
  ['A','B',2], ['A','C',4], ['B','D',2], ['B','E',5],
  ['C','D',3], ['C','F',4], ['D','F',4], ['E','F',2]
];
const OSI_LAYERS = ['Application','Presentation','Session','Transport','Network','Data Link','Physical'];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function normalizeRoll(value) { return String(value || '').trim().toUpperCase().replace(/\s+/g, ''); }
function toast(message) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = message;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2400);
}
function resetQuizData() {
  state.index = 0; state.answers = {}; state.route = ['A']; state.wifiOrder = [];
  state.packets = []; state.media = {}; state.mode = {}; state.errors = {};
  state.ipv4 = ['', '', '', '']; state.submitted = false; state.showReview = false;
}
function homeView() {
  state.page = 'home';
  state.identity = null;
  app.innerHTML = `
    <section class="hero-grid">
      <div class="hero-copy">
        <div class="eyebrow">CSE2251 / Individual assessment</div>
        <h1>Data Communication<br><span class="gradient-text">&amp; Computer Networks</span></h1>
        <p>A short assessment built around the concepts in your course notes. Work through ten simple activities using diagrams, matching, ordering and a routing map.</p>
        <div class="hero-actions">
          <a href="#entry" class="btn" id="heroStart">Start assessment <span aria-hidden="true">→</span></a>
          <button class="btn btn-secondary" id="heroLeaderboard">View leaderboard</button>
        </div>
        <div class="features">
          <div class="feature"><div class="feature-icon">10</div><strong>10 questions</strong><span>Each question is worth one mark.</span></div>
          <div class="feature"><div class="feature-icon">↗</div><strong>Interactive format</strong><span>Work directly with network diagrams and examples.</span></div>
          <div class="feature"><div class="feature-icon">01</div><strong>Individual attempt</strong><span>Complete the assessment independently.</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <svg class="mini-network" viewBox="0 0 440 280" role="img" aria-label="Illustration of a small computer network">
          <path class="edge" d="M220 134 L90 53 M220 134 L92 222 M220 134 L351 55 M220 134 L352 220 M90 53 L351 55 M92 222 L352 220"/>
          <path class="edge" d="M90 53 L92 222 M351 55 L352 220" opacity=".55"/>
          <circle class="node-main" cx="220" cy="134" r="34"/><text x="220" y="138" text-anchor="middle">SW</text>
          <circle class="node" cx="90" cy="53" r="22"/><text x="90" y="57" text-anchor="middle">A</text>
          <circle class="node" cx="92" cy="222" r="22"/><text x="92" y="226" text-anchor="middle">B</text>
          <circle class="node" cx="351" cy="55" r="22"/><text x="351" y="59" text-anchor="middle">C</text>
          <circle class="node" cx="352" cy="220" r="22"/><text x="352" y="224" text-anchor="middle">D</text>
        </svg>
        <div class="visual-caption"><span>Computer network</span><span>Illustrative topology</span></div>
      </div>
    </section>
    <section id="entry" class="login-grid">
      <div class="card card-pad">
        <div class="eyebrow">Student access</div>
        <h2>Ready to start?</h2>
        <p class="small">Enter your university roll number. Your registered name will appear automatically.</p>
        <form id="entryForm">
          <div class="field">
            <label for="rollInput">University roll number</label>
            <input id="rollInput" name="roll" autocomplete="off" placeholder="e.g. 20261LCS3032" required maxlength="32">
          </div>
          <div id="identityArea" aria-live="polite"></div>
          <div class="field" id="newNameField" hidden>
            <label for="newName">Your full name</label>
            <input id="newName" name="name" autocomplete="name" placeholder="Enter your full name" maxlength="100">
          </div>
          <button class="btn" type="submit" id="continueBtn" disabled>Continue <span>→</span></button>
        </form>
        <p class="inline-note">Unknown roll numbers can participate too. Their name will be saved as pending faculty verification.</p>
        <div class="backend-status ${BACKEND_READY ? 'connected' : 'disconnected'}" role="status">
          <span class="backend-dot"></span>
          ${BACKEND_READY ? 'Supabase project settings detected. Sign-in and submissions use the shared backend.' : 'Supabase is not configured yet. The assessment is locked until the project URL and publishable key are added.'}
        </div>
      </div>
      <aside class="card card-pad">
        <div class="eyebrow">Before you begin</div>
        <h3>Quiz guidelines</h3>
        <ul class="list-clean">
          <li><span class="check-dot">✓</span><span>There are 10 questions, each worth 1 mark.</span></li>
          <li><span class="check-dot">✓</span><span>No negative marking. Your score depends only on correct answers.</span></li>
          <li><span class="check-dot">✓</span><span>Questions are based on the supplied DCCN notes.</span></li>
          <li><span class="check-dot">✓</span><span>You can move backward and change answers before submitting.</span></li>
          <li><span class="check-dot">✓</span><span>The testing account is excluded from class marks and the leaderboard.</span></li>
        </ul>
        <div class="divider"></div>
        <div class="notice warning"><strong>Assessment status:</strong> Complete the Supabase and Vercel setup before opening the official quiz to students.</div>
      </aside>
    </section>`;

  const rollInput = document.getElementById('rollInput');
  const nameField = document.getElementById('newNameField');
  const nameInput = document.getElementById('newName');
  const continueBtn = document.getElementById('continueBtn');
  const identityArea = document.getElementById('identityArea');
  let foundStudent = null;
  let lookupSequence = 0;
  let lookupTimer = null;

function preview() {
    const roll = normalizeRoll(rollInput.value);
    foundStudent = null;
    nameField.hidden = true; nameInput.required = false; nameInput.value = '';
    identityArea.innerHTML = '';
    if (roll === 'ADMIN875' || roll === 'TEST34') {
      continueBtn.disabled = !BACKEND_READY;
      identityArea.innerHTML = `<div class="name-preview"><div class="avatar">${roll === 'ADMIN875' ? 'A' : 'T'}</div><div><strong>${roll === 'ADMIN875' ? 'Admin account' : 'Testing account'}</strong><small>${roll === 'ADMIN875' ? 'Open marks dashboard' : 'Test attempts are excluded from official results'}</small></div></div>`;
      return;
    }
    if (!roll) { continueBtn.disabled = true; return; }
    if (!BACKEND_READY) {
      continueBtn.disabled = true;
      identityArea.innerHTML = '<div class="notice warning">The Supabase connection has not been configured yet.</div>';
      return;
    }
    continueBtn.disabled = true;
    identityArea.innerHTML = '<div class="inline-note">Checking class list…</div>';
    scheduleLookup();
  }
  async function runLookup() {
    const roll = normalizeRoll(rollInput.value);
    if (!roll || roll === 'ADMIN875' || roll === 'TEST34' || !BACKEND_READY) return;
    const requestId = ++lookupSequence;
    identityArea.innerHTML = '<div class="inline-note">Checking class list…</div>';
    continueBtn.disabled = true;
    try {
      const result = await apiCall('lookup', { roll });
      if (requestId !== lookupSequence || roll !== normalizeRoll(rollInput.value)) return;
      if (result.known) {
        foundStudent = { roll, name: result.name, verification: result.verification || 'roster' };
        identityArea.innerHTML = `<div class="name-preview"><div class="avatar">${escapeHTML(result.name.charAt(0))}</div><div><strong>${escapeHTML(result.name)}</strong><small>Roll number found in class list</small></div></div>`;
        continueBtn.disabled = false;
      } else {
        nameField.hidden = false; nameInput.required = true;
        if (result.pendingName) nameInput.value = result.pendingName;
        identityArea.innerHTML = '<div class="notice warning">This roll number is not in the imported list. Enter your full name; the record will be marked pending verification.</div>';
        continueBtn.disabled = !nameInput.value.trim();
      }
    } catch (error) {
      if (requestId !== lookupSequence) return;
      identityArea.innerHTML = `<div class="notice warning">${escapeHTML(error.message)}</div>`;
      continueBtn.disabled = true;
    }
  }
  function scheduleLookup() {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(runLookup, 250);
  }
  rollInput.addEventListener('input', preview);
  nameInput.addEventListener('input', () => { continueBtn.disabled = !foundStudent && (!normalizeRoll(rollInput.value) || !nameInput.value.trim()); });
  document.getElementById('entryForm').addEventListener('submit', async e => {
    e.preventDefault();
    const roll = normalizeRoll(rollInput.value);
    if (!roll || !BACKEND_READY) return;
    continueBtn.disabled = true;
    continueBtn.textContent = 'Checking…';
    try {
      if (roll === 'ADMIN875' || roll === 'TEST34') {
        const result = await apiCall('special_login', { username: roll.toLowerCase() });
        const identity = { ...result.identity, sessionToken: result.token };
        if (identity.role === 'admin') { state.identity = identity; await adminView(); }
        else beginQuiz(identity);
      } else {
        const result = await apiCall('start', { roll, name: nameInput.value.trim() });
        if (result.needsName) {
          nameField.hidden = false; nameInput.required = true; nameInput.focus();
          identityArea.innerHTML = '<div class="notice warning">This roll number is not in the imported list. Enter your full name to continue.</div>';
          continueBtn.disabled = true;
          return;
        }
        beginQuiz({ ...result.identity, sessionToken: result.token });
      }
    } catch (error) {
      toast(error.message);
      continueBtn.disabled = false;
    } finally {
      if (document.getElementById('continueBtn')) document.getElementById('continueBtn').innerHTML = 'Continue <span>→</span>';
    }
  });
  document.getElementById('heroStart').addEventListener('click', () => setTimeout(() => rollInput.focus(), 50));
  document.getElementById('heroLeaderboard').addEventListener('click', leaderboardView);
}

function beginQuiz(identity) {
  state.identity = identity; resetQuizData(); renderQuiz();
}
function currentAnswer(qIndex = state.index) { return state.answers[qIndex]; }
function setAnswer(qIndex, value) { state.answers[qIndex] = value; }
function isComplete() {
  const a = state.answers;
  return Boolean(a[0]) && MEDIA_ITEMS.every(m => state.media[m.id]) && Boolean(a[2]) && MODE_ITEMS.every(m => state.mode[m.id]) && ERROR_ITEMS.every(m => state.errors[m.id]) && Boolean(a[5]) && state.wifiOrder.length === 5 && state.packets.length === 3 && state.route[state.route.length - 1] === 'F' && state.ipv4.every(v => String(v).trim() !== '');
}
function isQuestionAnswered(i) {
  if (i === 0) return Boolean(state.answers[0]);
  if (i === 1) return MEDIA_ITEMS.every(m => state.media[m.id]);
  if (i === 2) return Boolean(state.answers[2]);
  if (i === 3) return MODE_ITEMS.every(m => state.mode[m.id]);
  if (i === 4) return ERROR_ITEMS.every(m => state.errors[m.id]);
  if (i === 5) return Boolean(state.answers[5]);
  if (i === 6) return state.wifiOrder.length === 5;
  if (i === 7) return state.packets.length === 3;
  if (i === 8) return state.route[state.route.length - 1] === 'F';
  if (i === 9) return state.ipv4.every(v => String(v).trim() !== '');
  return false;
}
function renderQuiz() {
  state.page = 'quiz';
  const i = state.index;
  const q = QUESTIONS[i];
  const answeredCount = QUESTIONS.filter((_, idx) => isQuestionAnswered(idx)).length;
  const name = escapeHTML(state.identity.name);
  const roll = escapeHTML(state.identity.roll);
  const testBanner = state.identity.isTest ? `<div class="notice warning" style="margin-bottom:16px"><strong>TEST MODE:</strong> This attempt is for checking the website. It will not count toward class marks or the leaderboard.</div>` : '';
  app.innerHTML = `${testBanner}
    <div class="quiz-top">
      <div><div class="eyebrow">CSE2251 / Individual assessment</div><h2>Assessment</h2></div>
      <div class="quiz-student"><div class="avatar">${name.charAt(0) || 'S'}</div><div><strong>${name}</strong><small>${roll}</small></div></div>
    </div>
    <div class="quiz-progress-head"><span>Assessment progress</span><strong>${answeredCount} of 10 answered</strong></div>
    <div class="progress-wrap"><div class="progress-fill" style="width:${(answeredCount / 10) * 100}%"></div></div>
    <div class="quiz-layout">
      <aside class="question-nav card">
        <div class="question-nav-heading"><div><span class="nav-kicker">YOUR ATTEMPT</span><h4>Questions</h4></div><span class="nav-total">10 total</span></div>
        <div class="question-pips">${QUESTIONS.map((_, n) => `<button class="pip ${n === i ? 'current' : ''} ${isQuestionAnswered(n) ? 'done' : ''}" data-jump="${n}" aria-label="Go to question ${n+1}" aria-current="${n === i ? 'step' : 'false'}">${String(n+1).padStart(2,'0')}</button>`).join('')}</div>
        <div class="nav-legend"><span><i class="legend-dot current"></i>Current</span><span><i class="legend-dot done"></i>Completed</span></div>
        <div class="nav-progress"><span>Completed</span><strong>${answeredCount}<span class="muted" style="font-size:11px;font-weight:600"> / 10</span></strong></div>
      </aside>
      <section class="question-card card">
        <header class="question-heading">
          <div class="question-index-block"><span>QUESTION</span><strong>${String(i+1).padStart(2,'0')}</strong><small>OF 10</small></div>
          <div class="question-heading-copy">
            <div class="question-kicker">${escapeHTML(q.type)}</div>
            <h1 class="question-title">${escapeHTML(q.title)}</h1>
          </div>
          <div class="marks-pill"><strong>1</strong><span>MARK</span></div>
        </header>
        <div class="question-instruction-row"><span class="instruction-icon">i</span><p class="question-instruction">${escapeHTML(q.instruction)}</p></div>
        <div class="activity-heading"><span>INTERACTIVE ACTIVITY</span><span>Make your selection below</span></div>
        <div class="activity-shell"><div id="challengeArea">${renderChallenge(i)}</div></div>
        <div class="quiz-footer">
          <div class="left"><button class="btn btn-secondary" id="prevBtn" ${i===0?'disabled':''}>← Previous</button></div>
          <div class="footer-progress">Question ${i+1} of 10</div>
          <div class="right">${i === 9 ? `<button class="btn" id="submitQuizBtn">Submit assessment <span aria-hidden="true">✓</span></button>` : `<button class="btn" id="nextBtn">Next question <span aria-hidden="true">→</span></button>`}</div>
        </div>
      </section>
    </div>`;

  document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => { state.index = Number(btn.dataset.jump); renderQuiz(); }));
  document.getElementById('prevBtn').addEventListener('click', () => { if (state.index > 0) { state.index--; renderQuiz(); } });
  if (i < 9) document.getElementById('nextBtn').addEventListener('click', () => { state.index++; renderQuiz(); });
  else document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
  wireChallenge(i);
}

function renderChallenge(i) {
  if (i === 0) return `
    <div class="challenge-grid">
      ${topologyCard('bus','Diagram A',`<svg class="topo-svg" viewBox="0 0 180 90"><path d="M12 55 H168"/><path d="M32 55 V28 M90 55 V28 M148 55 V28"/><rect x="21" y="12" width="22" height="16" rx="3"/><rect x="79" y="12" width="22" height="16" rx="3"/><rect x="137" y="12" width="22" height="16" rx="3"/></svg>`)}
      ${topologyCard('ring','Diagram B',`<svg class="topo-svg" viewBox="0 0 180 90"><path d="M90 12 L143 43 L90 75 L37 43 Z"/><circle cx="90" cy="12" r="9"/><circle cx="143" cy="43" r="9"/><circle cx="90" cy="75" r="9"/><circle cx="37" cy="43" r="9"/></svg>`)}
      ${topologyCard('star','Diagram C',`<svg class="topo-svg" viewBox="0 0 180 90"><path d="M90 43 L31 14 M90 43 L149 14 M90 43 L31 75 M90 43 L149 75"/><circle cx="90" cy="43" r="14"/><rect x="20" y="4" width="22" height="18" rx="3"/><rect x="138" y="4" width="22" height="18" rx="3"/><rect x="20" y="66" width="22" height="18" rx="3"/><rect x="138" y="66" width="22" height="18" rx="3"/></svg>`)}
    </div><p class="inline-note">Select one diagram. The central device in a star topology connects all the other nodes.</p>`;
  if (i === 1) return `
    <div class="media-grid">${MEDIA_ITEMS.map(m => `<div class="media-item ${state.media[m.id]?'assigned':''}"><div class="media-title">${escapeHTML(m.name)}</div><div class="media-desc">${escapeHTML(m.detail)}</div><div class="segmented"><button data-media="${m.id}" data-kind="guided" class="${state.media[m.id]==='guided'?'active':''}">Guided</button><button data-media="${m.id}" data-kind="unguided" class="${state.media[m.id]==='unguided'?'active':''}">Unguided</button></div></div>`).join('')}</div>
    <div class="inline-note">Classify all four cards to complete this challenge.</div>`;
  if (i === 2) return `<div class="layer-stack">${OSI_LAYERS.map((l,n) => `<button class="layer-option ${state.answers[2]===l?'selected':''}" data-layer="${escapeHTML(l)}"><span>${7-n}</span><strong>${escapeHTML(l)} Layer</strong></button>`).join('')}</div>`;
  if (i === 3) return `<div class="matching-list">${MODE_ITEMS.map(m => `<div class="matching-row"><p>${escapeHTML(m.label)}</p><select data-mode="${m.id}"><option value="">Choose a mode</option><option value="simplex" ${state.mode[m.id]==='simplex'?'selected':''}>Simplex</option><option value="half" ${state.mode[m.id]==='half'?'selected':''}>Half-duplex</option><option value="full" ${state.mode[m.id]==='full'?'selected':''}>Full-duplex</option></select></div>`).join('')}</div>`;
  if (i === 4) return `<div class="error-cases">${ERROR_ITEMS.map(m => `<div class="error-case"><div class="q-pill">${m.title}</div><p>${escapeHTML(m.text)}</p><div class="chip-picks"><button class="chip ${state.errors[m.id]==='single'?'active':''}" data-error="${m.id}" data-value="single">Single-bit</button><button class="chip ${state.errors[m.id]==='burst'?'active':''}" data-error="${m.id}" data-value="burst">Burst</button></div></div>`).join('')}</div>`;
  if (i === 5) return `<div class="ethernet-diagram">
      <button class="pc-node ${state.answers[5]==='pc1'?'selected':''}" data-device="pc1"><span class="device-icon"><svg viewBox="0 0 36 30" aria-hidden="true"><rect x="4" y="3" width="28" height="19" rx="2"/><path d="M14 27h8M18 22v5M10 27h16"/></svg></span><strong>Device 1</strong></button>
      <div class="diagram-connector"></div>
      <button class="switch-node ${state.answers[5]==='switch'?'selected':''}" data-device="switch"><span class="device-icon"><svg viewBox="0 0 36 30" aria-hidden="true"><rect x="3" y="7" width="30" height="16" rx="3"/><path d="M8 12h3M15 12h3M22 12h3M8 18h3M15 18h3M22 18h3"/></svg></span><strong>Device 2</strong></button>
      <div class="diagram-connector"></div>
      <button class="pc-node ${state.answers[5]==='pc2'?'selected':''}" data-device="pc2"><span class="device-icon"><svg viewBox="0 0 36 30" aria-hidden="true"><rect x="4" y="3" width="28" height="19" rx="2"/><path d="M14 27h8M18 22v5M10 27h16"/></svg></span><strong>Device 3</strong></button>
    </div>`;
  if (i === 6) return `<div class="sequence-tray"><span class="muted tiny">Your order:</span>${state.wifiOrder.length ? state.wifiOrder.map((id,n)=>`<span class="sequence-item">${n+1}. ${escapeHTML(WIFI_STEPS.find(s=>s.id===id).text)}</span>`).join('') : '<span class="muted tiny">Tap the steps below in the correct order.</span>'}</div>
      <div class="wifi-order">${WIFI_CHOICES.map(id => {const step=WIFI_STEPS.find(s=>s.id===id);const pos=state.wifiOrder.indexOf(id);return `<button class="step-choice" data-wifi="${id}" ${pos>=0?'disabled':''}><span class="step-no">${pos>=0?pos+1:'+'}</span><strong>${escapeHTML(step.text)}</strong></button>`;}).join('')}</div>
      <div class="admin-tools"><button class="btn btn-secondary" id="undoWifi" ${state.wifiOrder.length?'':'disabled'}>Undo last</button><button class="btn btn-quiet" id="resetWifi">Reset order</button></div>`;
  if (i === 7) return `<div class="packet-board">
      <div class="packet-zone"><h4>PACKETS IN TRANSIT · TAP TO MOVE</h4><div class="packet-tray">${[1,2,3].map(n=>state.packets.includes(n)?'':`<button class="packet" data-packet="${n}">Packet ${n}</button>`).join('') || '<span class="muted tiny">All packets moved</span>'}</div></div>
      <div class="packet-zone"><h4>DESTINATION · REASSEMBLED MESSAGE</h4><div class="reassembled">${state.packets.sort((a,b)=>a-b).map(n=>`<span class="piece">Part ${n}</span>`).join('') || '<span class="muted tiny">Move the packets here</span>'}</div></div>
    </div><p class="inline-note">In packet switching, data is divided into packets and the packets are reassembled at the destination.</p>`;
  if (i === 8) return renderRouteChallenge();
  if (i === 9) return `<div class="octets">${state.ipv4.map((v,n)=>`<div class="octet"><label>Octet ${n+1}</label><input type="number" min="0" max="255" step="1" inputmode="numeric" data-octet="${n}" value="${escapeHTML(v)}" placeholder="0–255" aria-label="IPv4 octet ${n+1}"></div>`).join('')}</div>
    <div class="ipv4-preview">${state.ipv4.map((v,n)=>`${escapeHTML(v||'—')}${n<3?'<span class="muted">.</span>':''}`).join('')}</div>
    <div class="notice" style="margin-top:18px">An IPv4 address is 32 bits and is written as four decimal numbers separated by dots. Each number represents one byte (0–255).</div>`;
  return '';
}
function topologyCard(id, title, svg) { return `<button class="choice-card ${state.answers[0]===id?'selected':''}" data-topology="${id}">${svg}<strong>${title}</strong><small>Network diagram · Select this layout</small></button>`; }
function routeCost(path) {
  let total = 0;
  for (let i=1;i<path.length;i++) {
    const edge=ROUTE_EDGES.find(e=>(e[0]===path[i-1]&&e[1]===path[i])||(e[1]===path[i-1]&&e[0]===path[i]));
    if (!edge) return null; total += edge[2];
  }
  return total;
}
function routeNeighbors(node) {
  return ROUTE_EDGES.filter(e=>e[0]===node||e[1]===node).map(e=>e[0]===node?e[1]:e[0]).filter(n=>!state.route.includes(n));
}
function renderRouteChallenge() {
  const activeEdges = ROUTE_EDGES.filter(e => {const p=state.route;return p.some((n,i)=>i<p.length-1 && ((n===e[0]&&p[i+1]===e[1])||(n===e[1]&&p[i+1]===e[0])));});
  const activeKeys = new Set(activeEdges.map(e=>`${e[0]}-${e[1]}`));
  const edges = ROUTE_EDGES.map(e=>`<g><line class="route-edge ${activeKeys.has(`${e[0]}-${e[1]}`)?'active':''}" x1="${ROUTE_NODES[e[0]].x}" y1="${ROUTE_NODES[e[0]].y}" x2="${ROUTE_NODES[e[1]].x}" y2="${ROUTE_NODES[e[1]].y}"/><text class="route-cost" x="${(ROUTE_NODES[e[0]].x+ROUTE_NODES[e[1]].x)/2}" y="${(ROUTE_NODES[e[0]].y+ROUTE_NODES[e[1]].y)/2-8}" text-anchor="middle">${e[2]}</text></g>`).join('');
  const nodes = Object.entries(ROUTE_NODES).map(([name,pos])=>`<g data-node="${name}" aria-label="Select node ${name}"><circle class="route-node ${state.route.includes(name)?'active':''}" cx="${pos.x}" cy="${pos.y}" r="24"/><text x="${pos.x}" y="${pos.y+5}" text-anchor="middle">${name}</text></g>`).join('');
  const last=state.route[state.route.length-1];
  const finished=last==='F';
  return `<div class="route-startfinish"><span class="route-endpoint">Start <strong>A</strong></span><span class="route-endpoint">Destination <strong>F</strong></span></div><div class="route-wrap"><svg class="route-svg" viewBox="0 0 610 255" role="img" aria-label="Weighted network graph with nodes A to F">${edges}${nodes}</svg></div>
    <div class="route-info"><span class="route-stat">Selected path <strong>${state.route.join(' → ')}</strong></span><span class="route-stat">Total cost <strong>${routeCost(state.route) ?? 0}</strong></span><span class="route-stat">Hops <strong>${state.route.length-1}</strong></span></div>
    <div class="notice ${finished?'':'warning'}" style="margin-top:14px">${finished?'Destination F reached. Check the path and submit the quiz when ready.':`Your current node is ${last}. Select a connected node to continue.`}</div>
    <div class="admin-tools"><button class="btn btn-secondary" id="resetRoute">Reset path</button><span class="small muted" style="align-self:center">${finished?'Path complete':`Next: ${routeNeighbors(last).join(' or ') || 'No available next node'}`}</span></div>`;
}

function wireChallenge(i) {
  if (i===0) document.querySelectorAll('[data-topology]').forEach(b=>b.addEventListener('click',()=>{setAnswer(0,b.dataset.topology);renderQuiz();}));
  if (i===1) document.querySelectorAll('[data-media]').forEach(b=>b.addEventListener('click',()=>{state.media[b.dataset.media]=b.dataset.kind;renderQuiz();}));
  if (i===2) document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>{setAnswer(2,b.dataset.layer);renderQuiz();}));
  if (i===3) document.querySelectorAll('[data-mode]').forEach(s=>s.addEventListener('change',()=>{state.mode[s.dataset.mode]=s.value;}));
  if (i===4) document.querySelectorAll('[data-error]').forEach(b=>b.addEventListener('click',()=>{state.errors[b.dataset.error]=b.dataset.value;renderQuiz();}));
  if (i===5) document.querySelectorAll('[data-device]').forEach(b=>b.addEventListener('click',()=>{setAnswer(5,b.dataset.device);renderQuiz();}));
  if (i===6) {
    document.querySelectorAll('[data-wifi]').forEach(b=>b.addEventListener('click',()=>{if(!state.wifiOrder.includes(b.dataset.wifi)){state.wifiOrder.push(b.dataset.wifi);renderQuiz();}}));
    const undo=document.getElementById('undoWifi'); if(undo) undo.addEventListener('click',()=>{state.wifiOrder.pop();renderQuiz();});
    const reset=document.getElementById('resetWifi'); if(reset) reset.addEventListener('click',()=>{state.wifiOrder=[];renderQuiz();});
  }
  if (i===7) document.querySelectorAll('[data-packet]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.packet);if(!state.packets.includes(n)){state.packets.push(n);renderQuiz();}}));
  if (i===8) {
    document.querySelectorAll('[data-node]').forEach(g=>g.addEventListener('click',()=>{
      const node=g.dataset.node; const last=state.route[state.route.length-1];
      if (last === 'F') { toast('You have already reached destination F.'); return; }
      if (state.route.includes(node) || !routeNeighbors(last).includes(node)) { toast('Choose a connected node that is not already in the path.'); return; }
      state.route.push(node); renderQuiz();
    }));
    const reset=document.getElementById('resetRoute'); if(reset) reset.addEventListener('click',()=>{state.route=['A'];renderQuiz();});
  }
  if (i===9) document.querySelectorAll('[data-octet]').forEach(input=>input.addEventListener('input',()=>{
    const index=Number(input.dataset.octet); state.ipv4[index]=input.value;
    const preview=state.ipv4.map((v,n)=>`${escapeHTML(v||'—')}${n<3?'<span class="muted">.</span>':''}`).join('');
    const line=document.querySelector('#challengeArea .ipv4-preview'); if(line) line.innerHTML=preview;
  }));
}

async function submitQuiz() {
  if (state.submitted) return;
  if (!isComplete()) { toast('Please complete all ten activities before submitting.'); return; }
  const button = document.getElementById('submitQuizBtn');
  if (button) { button.disabled = true; button.textContent = 'Submitting…'; }
  const responses = {
    answers: state.answers, media: state.media, mode: state.mode, errors: state.errors,
    wifiOrder: state.wifiOrder, packets: state.packets, route: state.route, ipv4: state.ipv4
  };
  try {
    const result = await apiCall('submit', { token: state.identity.sessionToken, responses });
    const attempt = {
      id: result.attemptId, roll: state.identity.roll, name: state.identity.name,
      marks: result.marks, total: 10, completedAt: result.submittedAt,
      isTest: Boolean(result.isTest), verification: result.verification,
      rank: result.rank, review: result.review
    };
    state.submitted = true; state.lastAttempt = attempt; resultsView(attempt);
  } catch (error) {
    toast(error.message);
    if (button) { button.disabled = false; button.innerHTML = 'Submit assessment <span aria-hidden="true">✓</span>'; }
  }
}
function buildReview(attempt) {
  const review = Array.isArray(attempt.review) ? attempt.review : [];
  return review.map((item, i) => `<div class="review-item"><div class="help-row"><strong>${i+1}. ${escapeHTML(item.title)}</strong><span class="${item.correct?'status-good':'status-bad'}">${item.correct?'✓ 1 mark':'✕ 0 marks'}</span></div><p>${escapeHTML(item.explanation)}</p><p class="muted"><strong>Expected:</strong> ${escapeHTML(item.expected)}</p><p class="tiny muted">Source: ${escapeHTML(item.source)}</p></div>`).join('');
}
function resultsView(attempt) {
  state.page='results';
  const percent=attempt.marks*10;
  const rankLabel = attempt.isTest ? '—' : attempt.rank ? `#${attempt.rank}` : attempt.verification === 'pending' ? 'Pending' : '—';
  app.innerHTML=`<div class="card results-hero">
      <div class="eyebrow">Challenge completed</div>
      <h2>${attempt.isTest?'Test run complete':'Well done, '+escapeHTML(attempt.name)+'!'}</h2>
      <p class="small">${attempt.isTest?'This test result is stored separately and is not included in class rankings.':'Your result has been submitted to the shared assessment database.'}</p>
      <div class="score-ring" style="--score:${percent}%"><div><strong>${attempt.marks}<span class="muted">/10</span></strong><span>YOUR SCORE</span></div></div>
      <div class="result-stats"><div><strong>${percent}%</strong><span>Percentage</span></div><div><strong>${attempt.marks}/10</strong><span>Marks earned</span></div><div><strong>${rankLabel}</strong><span>Class rank</span></div></div>
      <div class="hero-actions" style="justify-content:center"><button class="btn" id="toggleReview">View answers & explanations</button><button class="btn btn-secondary" id="resultLeaderboard">Class leaderboard</button><button class="btn btn-quiet" id="resultHome">Home</button></div>
      ${attempt.verification==='pending'?'<div class="notice warning" style="max-width:600px;margin:18px auto 0">Your name was entered manually because the roll number was not on the imported list. An admin must verify the record before it appears on the leaderboard.</div>':''}
      ${attempt.isTest?'<div class="notice warning" style="max-width:600px;margin:18px auto 0">Test account results are excluded from official marks and the leaderboard.</div>':''}
    </div><div id="reviewPanel" class="card card-pad" style="margin-top:18px;display:none"><div class="section-head"><div><div class="eyebrow">Answer review</div><h3>What each challenge tested</h3></div></div><div class="review-list">${buildReview(attempt)}</div></div>`;
  document.getElementById('toggleReview').addEventListener('click',()=>{const panel=document.getElementById('reviewPanel');panel.style.display=panel.style.display==='none'?'block':'none';});
  document.getElementById('resultLeaderboard').addEventListener('click',leaderboardView);
  document.getElementById('resultHome').addEventListener('click',homeView);
}
async function leaderboardView() {
  state.page='leaderboard';
  app.innerHTML='<div class="card card-pad"><div class="eyebrow">Class rankings</div><h2>Leaderboard</h2><p class="small">Loading verified class results…</p></div>';
  try {
    const result = await apiCall('leaderboard');
    const data = result.leaderboard || [];
    app.innerHTML=`<div class="section-head"><div><div class="eyebrow">Class rankings</div><h2>Leaderboard</h2><p class="small">Rank is based only on marks. Equal scores share the same rank. Test and pending identities are excluded.</p></div><button class="btn btn-secondary" id="leaderHome">← Back home</button></div>
      <div class="card card-pad"><div class="help-row" style="margin-bottom:15px"><div><div class="eyebrow">Current standings</div><h3 style="margin:5px 0 0">${data.length} verified attempt${data.length===1?'':'s'}</h3></div><span class="tag">Marks / 10</span></div>
      ${data.length?`<div class="table-wrap"><table class="leader-table"><thead><tr><th>Rank</th><th>Student</th><th>Roll number</th><th>Score</th></tr></thead><tbody>${data.map(a=>`<tr><td><span class="rank-badge ${a.rank<=3?'rank-'+a.rank:''}">${a.rank}</span></td><td><strong>${escapeHTML(a.name)}</strong></td><td class="muted">${escapeHTML(a.rollMasked)}</td><td><strong>${a.marks}/10</strong></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state">No verified student attempts have been submitted yet.</div>`}
      </div>`;
    document.getElementById('leaderHome').addEventListener('click',homeView);
  } catch (error) {
    app.innerHTML=`<div class="card card-pad"><div class="eyebrow">Class rankings</div><h2>Leaderboard unavailable</h2><p>${escapeHTML(error.message)}</p><button class="btn btn-secondary" id="leaderHome">← Back home</button></div>`;
    document.getElementById('leaderHome').addEventListener('click',homeView);
  }
}
async function adminView() {
  state.page='admin';
  if (!state.identity || state.identity.role !== 'admin') { homeView(); toast('Admin sign-in required.'); return; }
  app.innerHTML='<div class="card card-pad"><div class="eyebrow">Admin area · admin875</div><h2>Assessment dashboard</h2><p class="small">Loading shared roster and marks…</p></div>';
  try {
    const result=await apiCall('admin_data',{token:state.identity.sessionToken});
    const roster=result.roster||[], attempts=result.attempts||[], pending=result.pending||[];
    const pendingOnly=pending.filter(p=>p.status==='pending');
    const attemptsByRoll=new Map(attempts.map(a=>[a.roll_number,a]));
    const approved=pending.filter(p=>p.status==='approved');
    const allRoster=[...roster,...approved.map(p=>({roll_number:p.roll_number,full_name:p.full_name,source:'approved'}))];
    app.innerHTML=`<div class="section-head"><div><div class="eyebrow">Admin area · admin875</div><h2>Assessment dashboard</h2><p class="small">Shared Supabase records. Official submissions are locked to one attempt per roll number.</p></div><button class="btn btn-secondary" id="adminHome">← Sign out</button></div>
      <div class="admin-stats"><div class="admin-stat"><strong>${allRoster.length}</strong><span>Roster students</span></div><div class="admin-stat"><strong>${attempts.length}</strong><span>Official submissions</span></div><div class="admin-stat"><strong>${attempts.filter(a=>a.verification_status!=='pending').length}</strong><span>Leaderboard eligible</span></div><div class="admin-stat"><strong>${pendingOnly.length}</strong><span>Pending identities</span></div></div>
      <div class="admin-tools"><button class="btn" id="exportMarks">Download Excel marksheet</button><button class="btn btn-secondary" id="refreshAdmin">Refresh data</button></div>
      <section class="card card-pad" style="margin-bottom:18px"><div class="section-head"><div><div class="eyebrow">Roster</div><h3>Imported student records</h3></div><span class="tag">${allRoster.length} records</span></div><div class="table-wrap" style="max-height:350px"><table class="leader-table"><thead><tr><th>Roll number</th><th>Name</th><th>Source</th><th>Attempt</th></tr></thead><tbody>${allRoster.map(s=>{const a=attemptsByRoll.get(s.roll_number);return `<tr><td>${escapeHTML(s.roll_number)}</td><td>${escapeHTML(s.full_name)}</td><td class="muted">${s.source==='manual'?'Added manually':s.source==='approved'?'Admin verified':'Spreadsheet'}</td><td>${a?`<span class="tag">${a.marks}/10</span>`:'<span class="muted">Not attempted</span>'}</td></tr>`;}).join('')}</tbody></table></div></section>
      <section class="card card-pad" style="margin-bottom:18px"><div class="section-head"><div><div class="eyebrow">Pending identities</div><h3>New roll numbers</h3></div><span class="tag pending">${pendingOnly.length} awaiting review</span></div>${pendingOnly.length?`<div class="table-wrap"><table class="leader-table"><thead><tr><th>Roll number</th><th>Name entered</th><th>Action</th></tr></thead><tbody>${pendingOnly.map(p=>`<tr><td>${escapeHTML(p.roll_number)}</td><td>${escapeHTML(p.full_name)}</td><td><button class="btn btn-secondary" style="min-height:32px;padding:0 10px" data-verify="${escapeHTML(p.roll_number)}">Approve identity</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">No unverified roll numbers are waiting for review.</div>'}</section>
      <section class="card card-pad"><div class="section-head"><div><div class="eyebrow">Submissions</div><h3>Official attempts</h3></div></div>${attempts.length?`<div class="table-wrap"><table class="leader-table"><thead><tr><th>Student</th><th>Roll number</th><th>Score</th><th>Identity</th><th>Submitted</th></tr></thead><tbody>${attempts.map(a=>`<tr><td>${escapeHTML(a.student_name)}</td><td>${escapeHTML(a.roll_number)}</td><td><strong>${a.marks}/10</strong></td><td><span class="tag ${a.verification_status==='pending'?'pending':''}">${a.verification_status==='pending'?'Pending':'Roster / verified'}</span></td><td class="muted">${new Date(a.submitted_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">No official submissions yet.</div>'}</section>
      <p class="inline-note">The Excel file includes every roster student, including students who have not attempted. Test account attempts are excluded. Pending students are marked for review.</p>`;
    document.getElementById('adminHome').addEventListener('click',homeView);
    document.getElementById('refreshAdmin').addEventListener('click',adminView);
    document.getElementById('exportMarks').addEventListener('click',()=>downloadMarksXLSX(allRoster,pending,attempts));
    document.querySelectorAll('[data-verify]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      try { await apiCall('approve_student',{token:state.identity.sessionToken,roll:button.dataset.verify}); toast('Student identity approved.'); await adminView(); }
      catch(error) { toast(error.message); button.disabled=false; }
    }));
  } catch (error) {
    app.innerHTML=`<div class="card card-pad"><div class="eyebrow">Admin area</div><h2>Could not load dashboard</h2><p>${escapeHTML(error.message)}</p><button class="btn btn-secondary" id="adminBack">Sign out</button></div>`;
    document.getElementById('adminBack').addEventListener('click',homeView);
  }
}
function downloadMarksXLSX(roster, pending, attempts) {
  if (!window.XLSX) { toast('Excel export library did not load. Refresh and try again.'); return; }
  const attemptsByRoll=new Map(attempts.map(a=>[a.roll_number,a]));
  const records=[...roster];
  pending.filter(p=>!records.some(s=>s.roll_number===p.roll_number)).forEach(p=>records.push({roll_number:p.roll_number,full_name:p.full_name,source:'pending'}));
  records.sort((a,b)=>a.roll_number.localeCompare(b.roll_number));
  const rows=records.map((s,i)=>{
    const a=attemptsByRoll.get(s.roll_number);
    return {
      'Sl. No.':i+1,
      'Roll Number':s.roll_number,
      'Student Name':s.full_name,
      'Marks / 10':a?a.marks:'',
      'Percentage':a?`${a.marks*10}%`:'',
      'Submission Status':a?'Submitted':'Not attempted',
      'Verification Status':a?(a.verification_status==='pending'?'Pending verification':a.verification_status==='verified'?'Verified':'Roster match'):(s.source==='pending'?'Pending verification':'Not applicable')
    };
  });
  const workbook=window.XLSX.utils.book_new();
  const sheet=window.XLSX.utils.json_to_sheet(rows);
  sheet['!cols']=[{wch:9},{wch:20},{wch:34},{wch:13},{wch:13},{wch:20},{wch:24}];
  window.XLSX.utils.book_append_sheet(workbook,sheet,'DCCN Marks');
  window.XLSX.writeFile(workbook,'DCCN_Quiz_Internal_Marks.xlsx');
}

// Top navigation always remains available.
document.getElementById('navHome').addEventListener('click',homeView);
document.getElementById('brandHome').addEventListener('click',e=>{e.preventDefault();homeView();});
document.getElementById('navLeaderboard').addEventListener('click',leaderboardView);
homeView();
