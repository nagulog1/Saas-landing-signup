// Thank-you dashboard: loads the signed-in lead from /api/me (cookie session)
(function () {
  const $ = (id) => document.getElementById(id);
  const PLAN_NAMES = { starter: 'Starter (free)', team: 'Team, ₹2,499/month', enterprise: 'Enterprise' };
  const FLEET_NAMES = { '1-25': '1–25 devices', '26-250': '26–250 devices', '251-2000': '251–2,000 devices', '2000+': 'More than 2,000 devices' };
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
  }

  async function load() {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.status === 401) return location.replace('/#signup');
    if (!res.ok) throw new Error('Could not load your dashboard');
    const me = await res.json();

    const first = me.name.split(' ')[0];
    const isWelcome = new URLSearchParams(location.search).has('welcome');
    $('welcomeLine').textContent = isWelcome ? 'Thanks for confirming your email' : 'Welcome back';
    $('hello').textContent = isWelcome ? `You're in, ${first}.` : `Hi, ${first}.`;
    if (isWelcome) history.replaceState(null, '', '/dashboard.html'); // refresh shows "Welcome back"

    const msLeft = new Date(me.trialEndsAt) - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / 864e5));
    $('trialEnd').textContent = fmtDate(me.trialEndsAt);
    $('daysLeft').textContent = daysLeft;
    $('trialBar').style.width = `${Math.round((daysLeft / 14) * 100)}%`;

    $('who').textContent = me.email;
    $('emailOut').textContent = me.email;
    $('plan').textContent = PLAN_NAMES[me.plan] || me.plan;
    $('fleet').textContent = FLEET_NAMES[me.fleetSize] || me.fleetSize;
    $('company').textContent = me.company || 'Not given';
    $('joined').textContent = fmtDate(me.verifiedAt);

    // API key: masked until "Show"
    const key = me.apiKey;
    const masked = key.slice(0, 8) + '•'.repeat(16) + key.slice(-4);
    let shown = false;
    $('apiKey').textContent = masked;
    $('revealBtn').addEventListener('click', () => {
      shown = !shown;
      $('apiKey').textContent = shown ? key : masked;
      $('revealBtn').textContent = shown ? 'Hide' : 'Show';
    });
    $('copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(key);
        toast('API key copied');
      } catch {
        toast("Couldn't copy. Click Show and copy it by hand.");
      }
    });

    $('snippet').textContent =
      `curl -X POST ${location.origin}/v1/heartbeat \\\n` +
      `  -H "Authorization: Bearer YOUR_API_KEY" \\\n` +
      `  -d '{"device":"pump-01","temp_c":31.4}'`;

    $('app').classList.remove('hidden');
  }

  $('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/';
  });

  load().catch((err) => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<p class="mx-auto max-w-page px-5 py-10 text-alert"></p>'
    );
    document.body.lastElementChild.textContent = `${err.message}. Refresh the page to try again.`;
  });
})();
