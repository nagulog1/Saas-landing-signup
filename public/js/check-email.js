// "Check your inbox" page: shows the address, resend with cooldown, dev preview link
(function () {
  const $ = (id) => document.getElementById(id);
  const email = sessionStorage.getItem('signupEmail');
  if (!email) {
    location.replace('/#signup');
    return;
  }
  $('emailOut').textContent = email;

  function showDev(dev) {
    if (!dev) return;
    const url = dev.previewUrl || dev.verifyUrl;
    if (!url) return;
    $('devLink').href = url;
    $('devLink').textContent = dev.previewUrl ? 'Open the email' : 'Open the confirmation link';
    $('devBox').classList.remove('hidden');
  }
  try {
    showDev(JSON.parse(sessionStorage.getItem('signupDev') || 'null'));
  } catch {}

  // Resend button with a countdown so people can't spam it
  const btn = $('resendBtn');
  const msg = $('resendMsg');
  let timer;
  function cooldown(seconds) {
    clearInterval(timer);
    btn.disabled = true;
    const tick = () => {
      if (seconds <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'Send the email again';
        return;
      }
      btn.textContent = `Send again in ${seconds}s`;
      seconds--;
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  cooldown(60); // the first email was sent just now

  btn.addEventListener('click', async () => {
    msg.textContent = '';
    btn.disabled = true;
    try {
      const res = await fetch('/api/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        msg.textContent = body.error;
        return cooldown(body.retryAfter || 60);
      }
      if (!res.ok) throw new Error(body.error || 'Could not send the email.');
      msg.textContent = `Sent. Check ${email} again.`;
      if (body.dev) {
        sessionStorage.setItem('signupDev', JSON.stringify(body.dev));
        showDev(body.dev);
      }
      cooldown(60);
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false;
    }
  });
})();
