import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const encoder = new TextEncoder();
const QUESTIONS = [
  { title: 'Network topology', explanation: 'A star topology connects all computers to one central hub or device.', expected: 'Star topology', source: 'Module 1.1, slide 27' },
  { title: 'Guided / unguided media', explanation: 'Twisted pair, coaxial cable and optical fiber are guided media. Radio waves are unguided media.', expected: 'Twisted pair = guided; coaxial = guided; optical fiber = guided; radio waves = unguided.', source: 'Module 1.2, slides 5–6 and 17–18' },
  { title: 'Physical Layer', explanation: 'The Physical Layer handles the physical transmission of bits through a medium.', expected: 'Physical Layer', source: 'Module 1.1, slide 72; Module 1.2, slide 3' },
  { title: 'Transmission modes', explanation: 'Keyboard input is simplex, a walkie-talkie is half-duplex, and a telephone is full-duplex.', expected: 'Keyboard = simplex; walkie-talkie = half-duplex; telephone = full-duplex.', source: 'Module 1.1, slides 13–15' },
  { title: 'Single-bit and burst errors', explanation: 'A single-bit error changes one bit. A burst error changes two or more bits.', expected: 'Example A = single-bit; Example B = burst.', source: 'Module 2.1, slides 19–20' },
  { title: 'Ethernet switch', explanation: 'A switch examines the destination MAC address and forwards the frame to the appropriate port.', expected: 'Switch', source: 'Module 2.2, slides 15–16' },
  { title: 'Wi-Fi sequence', explanation: 'The device finds the network, connects, prepares data in a wireless frame, transmits it, and the access point forwards the data.', expected: 'Find network → Connect → Prepare data → Transmit → Forward data.', source: 'Module 2.3, slide 5' },
  { title: 'Packet reassembly', explanation: 'Packet switching divides data into packets. At the destination, the packets are reassembled into the original data.', expected: 'All three packets moved to the destination tray.', source: 'Module 3.1, slides 9–10' },
  { title: 'Least-cost route', explanation: 'A → C → F costs 8 (4 + 4) and uses 2 hops. A → B → D → F also costs 8 but uses 3 hops, so A → C → F wins the fewer-hops tie-break.', expected: 'A → C → F · cost 8 · 2 hops', source: 'Module 3.2, slides 3–6 and 10; practice graph created for this quiz' },
  { title: 'IPv4 dotted-decimal format', explanation: 'An IPv4 address is written as four decimal numbers separated by dots. Each octet is 0–255; unnecessary leading zeros are not used.', expected: 'Four valid decimal octets, each from 0 to 255.', source: 'Module 3.1, slides 22–23, 40 and 50–51' },
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function b64url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
async function hmac(data: string) {
  const secret = Deno.env.get('APP_SESSION_SECRET');
  if (!secret || secret.length < 32) throw new Error('APP_SESSION_SECRET is not configured (use at least 32 characters).');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}
async function createSession(payload: Record<string, unknown>) {
  const body = b64url(encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, nonce: crypto.randomUUID() })));
  return `${body}.${b64url(await hmac(body))}`;
}
async function readSession(token: string) {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) throw new Error('Invalid session. Please sign in again.');
  const expected = await hmac(body);
  const supplied = fromB64url(signature);
  if (expected.length !== supplied.length) throw new Error('Invalid session signature.');
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ supplied[i];
  if (mismatch !== 0) throw new Error('Invalid session signature.');
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Your session expired. Please sign in again.');
  return payload;
}
function normalizeRoll(value: unknown) { return String(value ?? '').trim().toUpperCase().replace(/\s+/g, ''); }
function isValidIpv4(values: unknown) {
  return Array.isArray(values) && values.length === 4 && values.every((value) => {
    const s = String(value ?? '').trim();
    if (!/^\d{1,3}$/.test(s) || (s.length > 1 && s.startsWith('0'))) return false;
    const n = Number(s); return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}
function scoreResponses(r: Record<string, any>) {
  const correct = [
    r.answers?.[0] === 'star',
    ['twisted', 'coax', 'fiber'].every((k) => r.media?.[k] === 'guided') && r.media?.radio === 'unguided',
    r.answers?.[2] === 'Physical',
    r.mode?.keyboard === 'simplex' && r.mode?.walkie === 'half' && r.mode?.phone === 'full',
    r.errors?.single === 'single' && r.errors?.burst === 'burst',
    r.answers?.[5] === 'switch',
    Array.isArray(r.wifiOrder) && r.wifiOrder.join('|') === 'find|connect|prepare|transmit|forward',
    Array.isArray(r.packets) && r.packets.length === 3 && [1, 2, 3].every((n) => r.packets.includes(n)),
    Array.isArray(r.route) && r.route.join('|') === 'A|C|F',
    isValidIpv4(r.ipv4),
  ];
  const marks = correct.filter(Boolean).length;
  const review = QUESTIONS.map((q, i) => ({ ...q, correct: correct[i], marks: correct[i] ? 1 : 0 }));
  return { marks, review };
}
function maskRoll(roll: string) {
  if (roll.length <= 5) return `${roll.slice(0, 1)}•••`;
  return `${roll.slice(0, 4)}••••${roll.slice(-2)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed', message: 'Use POST.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: 'server_not_configured', message: 'Supabase server credentials are not configured.' }, 503);
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'lookup') {
      const roll = normalizeRoll(body.roll);
      if (!roll) return json({ error: 'invalid_roll', message: 'Enter a roll number.' }, 400);
      const { data, error } = await db.from('roster').select('roll_number, full_name').eq('roll_number', roll).maybeSingle();
      if (error) throw error;
      if (data) return json({ ok: true, known: true, roll, name: data.full_name });
      const { data: pending } = await db.from('pending_students').select('full_name, status').eq('roll_number', roll).maybeSingle();
      if (pending?.status === 'approved') return json({ ok: true, known: true, roll, name: pending.full_name, verification: 'verified' });
      return json({ ok: true, known: false, roll, pendingName: pending?.full_name || null, status: pending?.status || null });
    }

    if (action === 'special_login') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!['admin875', 'test34'].includes(username)) return json({ error: 'invalid_account', message: 'Unknown special account.' }, 400);
      // Password-free mode requested by the user: the special account ID itself selects the role.
      // Anyone who knows one of these IDs can enter that mode; document this security trade-off.
      const role = username === 'admin875' ? 'admin' : 'test';
      const token = await createSession({ role, roll: username, name: role === 'admin' ? 'Administrator' : 'Testing account' });
      return json({ ok: true, token, identity: { role, roll: username, name: role === 'admin' ? 'Administrator' : 'Testing account', isTest: role === 'test', verification: role } });
    }

    if (action === 'start') {
      const roll = normalizeRoll(body.roll);
      if (!roll || roll === 'ADMIN875' || roll === 'TEST34') return json({ error: 'invalid_roll', message: 'Enter a valid student roll number.' }, 400);
      const { data: known, error: rosterError } = await db.from('roster').select('full_name').eq('roll_number', roll).maybeSingle();
      if (rosterError) throw rosterError;
      let name = known?.full_name;
      let verification = 'roster';
      const { data: existing, error: attemptError } = await db.from('attempts').select('id').eq('roll_number', roll).eq('is_test', false).maybeSingle();
      if (attemptError) throw attemptError;
      if (existing) return json({ error: 'already_attempted', message: 'An official attempt has already been submitted for this roll number.' }, 409);
      if (!known) {
        const { data: pendingRecord, error: pendingError } = await db.from('pending_students').select('full_name, status').eq('roll_number', roll).maybeSingle();
        if (pendingError) throw pendingError;
        if (pendingRecord?.status === 'approved') {
          name = pendingRecord.full_name;
          verification = 'verified';
        } else {
          name = String(body.name || '').trim();
          if (!name) return json({ ok: true, needsName: true, message: 'This roll number is not in the class list. Enter your full name.' });
          if (name.length > 100) return json({ error: 'invalid_name', message: 'Name must be 100 characters or fewer.' }, 400);
          verification = 'pending';
          const { error } = await db.from('pending_students').upsert({ roll_number: roll, full_name: name, status: 'pending' }, { onConflict: 'roll_number' });
          if (error) throw error;
        }
      }
      const token = await createSession({ role: 'student', roll, name, verification });
      return json({ ok: true, token, identity: { role: 'student', roll, name, isTest: false, verification } });
    }

    if (action === 'submit') {
      const session = await readSession(String(body.token || ''));
      if (!['student', 'test'].includes(session.role)) return json({ error: 'forbidden', message: 'This account cannot submit a student quiz.' }, 403);
      const responses = body.responses || {};
      const { marks, review } = scoreResponses(responses);
      const isTest = session.role === 'test';
      let verification = isTest ? 'test' : String(session.verification || 'pending');
      if (!isTest && verification === 'pending') {
        const { data: pending } = await db.from('pending_students').select('status').eq('roll_number', session.roll).maybeSingle();
        if (pending?.status === 'approved') verification = 'verified';
      }
      const { data: saved, error } = await db.from('attempts').insert({
        roll_number: session.roll,
        student_name: session.name,
        marks,
        total_marks: 10,
        verification_status: verification,
        is_test: isTest,
        responses,
      }).select('id, submitted_at').single();
      if (error) {
        if (error.code === '23505') return json({ error: 'already_attempted', message: 'An official attempt has already been submitted for this roll number.' }, 409);
        throw error;
      }
      let rank: number | null = null;
      if (!isTest && ['roster', 'verified'].includes(verification)) {
        const { data: rows, error: rankError } = await db.from('attempts').select('roll_number, marks, student_name').eq('is_test', false).in('verification_status', ['roster', 'verified']).order('marks', { ascending: false }).order('student_name', { ascending: true });
        if (rankError) throw rankError;
        let previous: number | null = null; let currentRank = 0;
        (rows || []).forEach((row: any, index: number) => { if (row.marks !== previous) currentRank = index + 1; if (row.roll_number === session.roll) rank = currentRank; previous = row.marks; });
      }
      return json({ ok: true, attemptId: saved.id, marks, total: 10, submittedAt: saved.submitted_at, isTest, verification, rank, review });
    }

    if (action === 'leaderboard') {
      const { data, error } = await db.from('attempts').select('roll_number, student_name, marks, submitted_at').eq('is_test', false).in('verification_status', ['roster', 'verified']).order('marks', { ascending: false }).order('student_name', { ascending: true }).limit(100);
      if (error) throw error;
      let rank = 0; let previous: number | null = null;
      const rows = (data || []).map((row: any, i: number) => { if (row.marks !== previous) rank = i + 1; previous = row.marks; return { rank, name: row.student_name, rollMasked: maskRoll(row.roll_number), marks: row.marks, submittedAt: row.submitted_at }; });
      return json({ ok: true, leaderboard: rows });
    }

    if (action === 'admin_data' || action === 'approve_student') {
      const session = await readSession(String(body.token || ''));
      if (session.role !== 'admin') return json({ error: 'forbidden', message: 'Admin access required.' }, 403);
      if (action === 'approve_student') {
        const roll = normalizeRoll(body.roll);
        const { error: pendingError } = await db.from('pending_students').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'admin875' }).eq('roll_number', roll).eq('status', 'pending');
        if (pendingError) throw pendingError;
        const { error: attemptsError } = await db.from('attempts').update({ verification_status: 'verified' }).eq('roll_number', roll).eq('is_test', false).eq('verification_status', 'pending');
        if (attemptsError) throw attemptsError;
        return json({ ok: true });
      }
      const [roster, attempts, pending] = await Promise.all([
        db.from('roster').select('roll_number, full_name, source').order('roll_number'),
        db.from('attempts').select('roll_number, student_name, marks, verification_status, is_test, submitted_at').eq('is_test', false).order('submitted_at', { ascending: false }),
        db.from('pending_students').select('roll_number, full_name, status, created_at, reviewed_at').order('created_at', { ascending: false }),
      ]);
      if (roster.error) throw roster.error; if (attempts.error) throw attempts.error; if (pending.error) throw pending.error;
      return json({ ok: true, roster: roster.data || [], attempts: attempts.data || [], pending: pending.data || [] });
    }

    return json({ error: 'unknown_action', message: 'Unknown API action.' }, 400);
  } catch (error) {
    console.error('quiz-api error:', error);
    return json({ error: 'server_error', message: error instanceof Error ? error.message : 'Unexpected server error.' }, 500);
  }
});
