/**
 * Email sanity check for the pre-save form.
 *
 * Runs before the submission reaches Netlify Forms and catches the three
 * kinds of junk that actually show up: made-up domains, disposable
 * addresses, and typos in the big providers.
 *
 * What it CANNOT do: prove the address belongs to the person typing it.
 * Only a confirmation email (double opt-in) does that, and that can't sit
 * in front of the pre-save without killing the conversion.
 *
 * Fails open on purpose: if the DNS lookup is slow or down, the address is
 * accepted. A check of ours must never cost a signup.
 */

/** Throwaway providers. Not exhaustive — covers what turns up in practice. */
const DISPOSABLE = new Set([
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com',
  'guerrillamail.info', 'sharklasers.com', 'grr.la', '10minutemail.com',
  '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'throwawaymail.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'fakeinbox.com', 'mintemail.com', 'mohmal.com', 'spamgourmet.com',
  'mailnesia.com', 'tempinbox.com', 'emailondeck.com', 'discard.email',
  'moakt.com', 'tempr.email', 'luxusmail.org', 'inboxbear.com',
]);

/** One-character slips on the providers our audience actually uses. */
const TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.it': 'gmail.com', 'hotmai.com': 'hotmail.com', 'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'hotmal.it': 'hotmail.it', 'homail.it': 'hotmail.it',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com',
  'libro.it': 'libero.it', 'liberio.it': 'libero.it', 'libero.com': 'libero.it',
  'virgilo.it': 'virgilio.it', 'tiscai.it': 'tiscali.it',
};

/** Domains that exist but are never a real inbox. */
const NONSENSE = new Set(['asd.com', 'asdasd.com', 'test.com', 'example.com', 'email.com']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Does the domain accept mail at all? MX, or an A record as fallback. */
async function acceptsMail(domain) {
  const ask = async (type) => {
    const url = new URL('https://cloudflare-dns.com/dns-query');
    url.searchParams.set('name', domain);
    url.searchParams.set('type', type);
    const res = await fetch(url, { headers: { accept: 'application/dns-json' } });
    if (!res.ok) throw new Error('dns ' + res.status);
    return res.json();
  };

  const mx = await ask('MX');
  if (Array.isArray(mx.Answer) && mx.Answer.some((a) => a.type === 15)) return true;

  // Some small domains route mail on the A record alone.
  const a = await ask('A');
  return Array.isArray(a.Answer) && a.Answer.some((r) => r.type === 1);
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const email = String(body?.email ?? '').trim().toLowerCase();

  // Shape first: one @, something either side, a dotted TLD of 2+ letters.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) || email.length > 254) {
    return json({ ok: false, reason: 'format' });
  }

  const domain = email.split('@')[1];

  if (TYPOS[domain]) {
    return json({
      ok: false,
      reason: 'typo',
      suggestion: email.slice(0, -domain.length) + TYPOS[domain],
    });
  }

  if (DISPOSABLE.has(domain) || NONSENSE.has(domain)) {
    return json({ ok: false, reason: 'disposable' });
  }

  try {
    const reachable = await acceptsMail(domain);
    if (!reachable) return json({ ok: false, reason: 'domain' });
  } catch {
    // DNS unreachable: let it through rather than lose the signup.
    return json({ ok: true, checked: false });
  }

  return json({ ok: true, checked: true });
};
