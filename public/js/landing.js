// Landing page: live fleet demo, plan picking, sign-up form validation and submit
(function () {
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Hero fleet demo ---------------- */
  const fleet = $('fleet');
  const log = $('log');
  const onlineCount = $('onlineCount');
  const PREFIXES = ['pump', 'flow', 'gw', 'tank', 'valve', 'meter'];
  const PEOPLE = ['Divya', 'Karthik', 'Priya', 'Arjun'];
  const cells = [];

  for (let i = 0; i < 96; i++) {
    const c = document.createElement('div');
    c.className = 'cell aspect-square rounded-[3px] bg-live/70';
    c.dataset.name = `${PREFIXES[i % PREFIXES.length]}-${String(Math.floor(i / PREFIXES.length) + 1).padStart(2, '0')}`;
    fleet.append(c);
    cells.push(c);
  }

  const now = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
  function addLog(text, tone) {
    const li = document.createElement('li');
    li.className = 'log-line flex gap-3';
    const t = document.createElement('span');
    t.className = 'text-white/45';
    t.textContent = now();
    const m = document.createElement('span');
    m.className = tone === 'bad' ? 'text-[#FF8F92]' : tone === 'ok' ? 'text-live' : 'text-amber';
    m.textContent = text;
    li.append(t, m);
    log.append(li);
    while (log.children.length > 5) log.firstElementChild.remove();
  }

  function setOnline() {
    onlineCount.textContent = cells.filter((c) => !c.classList.contains('down')).length;
  }

  if (reduceMotion) {
    // Still picture: one device is down
    cells[29].classList.add('down');
    setOnline();
    addLog(`${cells[29].dataset.name} stopped reporting`, 'bad');
    addLog('Paged Divya, on call', 'warn');
  } else {
    addLog('All 96 devices reporting', 'ok');
    // Heartbeats: random devices blink as they report in
    setInterval(() => {
      const c = cells[Math.floor(Math.random() * cells.length)];
      if (c.classList.contains('down')) return;
      c.classList.add('beat');
      setTimeout(() => c.classList.remove('beat'), 450);
    }, 90);

    // Every few seconds one device goes quiet, someone is paged, it recovers
    let person = 0;
    const incident = () => {
      const healthy = cells.filter((c) => !c.classList.contains('down'));
      const c = healthy[Math.floor(Math.random() * healthy.length)];
      c.classList.add('down');
      setOnline();
      addLog(`${c.dataset.name} stopped reporting`, 'bad');
      const who = PEOPLE[person++ % PEOPLE.length];
      setTimeout(() => addLog(`Paged ${who}, on call`, 'warn'), 1200);
      setTimeout(() => {
        c.classList.remove('down');
        setOnline();
        addLog(`${c.dataset.name} back online`, 'ok');
      }, 4200);
    };
    setTimeout(incident, 1500);
    setInterval(incident, 6000);
  }

  /* ---------------- Getting into the form ---------------- */
  const form = $('signupForm');
  const emailInput = $('email');

  function goToSignup(focusEl) {
    $('signup').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => focusEl.focus({ preventScroll: true }), reduceMotion ? 0 : 500);
  }

  // Hero email box: carry the email down to the full form
  $('heroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('heroEmail').value.trim();
    if (v) emailInput.value = v;
    goToSignup($('name'));
  });

  // Pricing buttons pre-select the plan
  document.querySelectorAll('.plan-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      form.querySelector(`input[name="plan"][value="${btn.dataset.plan}"]`).checked = true;
      goToSignup($('name'));
    })
  );

  // Remember where the visitor came from (?utm_source=linkedin)
  const params = new URLSearchParams(location.search);
  $('source').value = (params.get('utm_source') || params.get('ref') || 'direct').slice(0, 60);

  /* ---------------- Validation ---------------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const NAME_RE = /^[\p{L}][\p{L} .'-]{1,59}$/u;

  const rules = {
    name: (v) => (!v ? 'Enter your name.' : !NAME_RE.test(v) ? 'Use 2–60 letters. Spaces, dots, hyphens and apostrophes are fine.' : ''),
    email: (v) => (!v ? 'Enter your work email.' : !EMAIL_RE.test(v) ? 'Enter an email like name@company.com.' : ''),
    company: (v) => (v.length > 80 ? 'Keep the company name under 80 characters.' : ''),
    fleetSize: (v) => (!v ? 'Choose how many devices you run.' : ''),
    consent: (v) => (!v ? 'Accept the terms to create your account.' : ''),
  };

  function values() {
    const fd = new FormData(form);
    return {
      name: (fd.get('name') || '').trim(),
      email: (fd.get('email') || '').trim(),
      company: (fd.get('company') || '').trim(),
      fleetSize: fd.get('fleetSize') || '',
      plan: fd.get('plan') || 'starter',
      consent: $('consent').checked,
      website: fd.get('website') || '',
      source: fd.get('source') || 'direct',
    };
  }

  function showError(field, msg) {
    const err = $(`${field}-error`);
    if (!err) return;
    err.textContent = msg;
    err.classList.toggle('hidden', !msg);
    const input = field === 'fleetSize' ? null : $(field);
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  // Validate a field when the person leaves it, and re-check while they fix it
  ['name', 'email', 'company'].forEach((f) => {
    const el = $(f);
    el.addEventListener('blur', () => el.value && showError(f, rules[f](el.value.trim())));
    el.addEventListener('input', () => el.getAttribute('aria-invalid') === 'true' && showError(f, rules[f](el.value.trim())));
  });
  form.querySelectorAll('input[name="fleetSize"]').forEach((r) => r.addEventListener('change', () => showError('fleetSize', '')));
  $('consent').addEventListener('change', (e) => e.target.checked && showError('consent', ''));

  /* ---------------- Submit ---------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('formError').classList.add('hidden');
    const data = values();

    let firstBad = null;
    for (const [field, check] of Object.entries(rules)) {
      const msg = check(data[field]);
      showError(field, msg);
      if (msg && !firstBad) firstBad = field;
    }
    if (firstBad) {
      const el = firstBad === 'fleetSize' ? form.querySelector('input[name="fleetSize"]') : $(firstBad);
      el.focus();
      return;
    }

    const btn = $('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Creating your trial…';
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 400 && body.errors) {
        Object.entries(body.errors).forEach(([f, m]) => showError(f, m));
        throw new Error(body.error);
      }
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');

      sessionStorage.setItem('signupEmail', body.email);
      if (body.dev) sessionStorage.setItem('signupDev', JSON.stringify(body.dev));
      else sessionStorage.removeItem('signupDev');
      location.href = '/check-email.html';
    } catch (err) {
      $('formError').textContent = err.message;
      $('formError').classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Start free trial';
    }
  });
})();
