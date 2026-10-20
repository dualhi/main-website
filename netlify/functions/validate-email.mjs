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

/**
 * Mailbox names nobody reads. Catches the usual "pippo@<real domain>",
 * which no DNS check can ever rule out.
 */
const FAKE_MAILBOX = new Set([
  'pippo', 'pluto', 'paperino', 'topolino', 'pinco', 'pincopallino', 'pallino',
  'mariorossi', 'mario.rossi', 'johndoe', 'john.doe', 'janedoe',
  'test', 'tests', 'testing', 'prova', 'prove', 'provaprova', 'esempio',
  'example', 'sample', 'demo', 'fake', 'finta', 'finto', 'nessuno', 'nobody',
  'asd', 'asdf', 'asdasd', 'qwerty', 'aaa', 'aaaa', 'abc', 'abcd', 'xxx',
  'xxxx', 'ciao', 'boh', 'niente', 'anonimo', 'anonymous', 'noreply',
  'no-reply', 'donotreply', 'spam', 'trash', 'cestino', 'vaffanculo',
]);

/** Domains that exist but are never a real inbox. */
const NONSENSE = new Set(['asd.com', 'asdasd.com', 'test.com', 'example.com', 'email.com']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * Does the domain accept mail? MX records only.
 *
 * An A record is NOT enough: plenty of domains serve a website and take no
 * mail at all (gaypride.com was the one that slipped through). Falling back
 * to A let every parked domain in.
 */
async function acceptsMail(domain) {
  const url = new URL('https://cloudflare-dns.com/dns-query');
  url.searchParams.set('name', domain);
  url.searchParams.set('type', 'MX');

  const res = await fetch(url, { headers: { accept: 'application/dns-json' } });
  if (!res.ok) throw new Error('dns ' + res.status);

  const data = await res.json();
  const mx = (data.Answer || []).filter((a) => a.type === 15);

  // A single "." target is the null MX record: the domain refuses mail.
  if (mx.length === 1 && /^0?\s*\.$/.test(String(mx[0].data).trim())) return false;

  return mx.length > 0;
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

  // Strip the +tag and any dots before comparing: pippo+x@ and p.i.ppo@
  // are the same mailbox.
  const mailbox = email.split('@')[0].split('+')[0].replace(/\./g, '');
  if (FAKE_MAILBOX.has(mailbox) || /^(.)\1{2,}$/.test(mailbox)) {
    return json({ ok: false, reason: 'fake' });
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
