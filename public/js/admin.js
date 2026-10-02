// Leads admin: password-protected list, funnel stats and CSV export
(function () {
  const $ = (id) => document.getElementById(id);
  let key = sessionStorage.getItem('adminKey') || '';

  async function api(path) {
    const res = await fetch(path, { headers: { 'x-admin-key': key } });
    if (res.status === 401) {
      sessionStorage.removeItem('adminKey');
      throw new Error('Wrong admin password');
    }
    if (!res.ok) throw new Error('Could not load leads');
    return res;
  }

  function cell(text, cls = '') {
    const td = document.createElement('td');
    td.className = `px-4 py-3 ${cls}`;
    td.textContent = text;
    return td;
  }

  async function load() {
    const { stats, leads } = await (await api('/api/admin/leads')).json();
    $('gate').classList.add('hidden');
    $('panel').classList.remove('hidden');

    $('sTotal').textContent = stats.total;
    $('sVerified').textContent = stats.verified;
    $('sRate').textContent = `${stats.verificationRate}%`;
    const top = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0];
    $('sSource').textContent = top ? top[0] : '–';

    const rows = $('rows');
    rows.innerHTML = '';
    $('noLeads').classList.toggle('hidden', leads.length > 0);
    for (const l of leads) {
      const tr = document.createElement('tr');
      tr.append(
        cell(l.name, 'font-medium'),
        cell(l.email),
        cell(l.company || '–', 'text-muted'),
        cell(l.fleetSize),
        cell(l.plan[0].toUpperCase() + l.plan.slice(1)),
        cell(l.source, 'text-muted')
      );
      const status = document.createElement('td');
      status.className = 'px-4 py-3';
      const pill = document.createElement('span');
      pill.className = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm ${l.verified ? 'bg-live/15 text-[#167A46]' : 'bg-amber/20 text-[#7A5A00]'}`;
      pill.textContent = l.verified ? 'Confirmed' : 'Waiting';
      status.append(pill);
      tr.append(status, cell(new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), 'text-muted whitespace-nowrap'));
      rows.append(tr);
    }
  }

  $('gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    key = $('pw').value;
    try {
      await load();
      sessionStorage.setItem('adminKey', key);
    } catch (err) {
      $('gateError').textContent = err.message;
      $('gateError').classList.remove('hidden');
    }
  });

  $('refreshBtn').addEventListener('click', () => load().catch((e) => alert(e.message)));

  $('csvBtn').addEventListener('click', async () => {
    const blob = await (await api('/api/admin/leads.csv')).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meshwatch-leads.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  if (key) load().catch(() => {});
})();
