const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = __dirname;
const seed = fs.readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8');
const roster = [...seed.matchAll(/^\s*\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/gm)].map(m => ({ roll: m[1], name: m[2], source: m[3] }));
assert.equal(roster.length, 61, 'Expected 61 roster records in the Supabase seed');
assert.equal(new Set(roster.map(s => s.roll)).size, 61, 'Roll numbers must be unique');
assert(roster.some(s => s.roll === '20261LCS3032' && s.name === 'Naveen Kumar NL'));
assert(roster.some(s => s.roll === '20261LCS3036' && s.name === 'Raghavendra B'));
assert(roster.some(s => s.roll === '20261LCS3028' && s.name === 'Jagan N'));
assert(roster.some(s => s.roll === '20261LCS3033' && s.name === 'Bharath BS'));
assert(roster.some(s => s.roll === '20261LCS3035' && s.name === 'Aditya'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(!/studentAccessCode|studentCodeField|specialPassword|specialPasswordField|accessCode|type=[\"']password/i.test(app), 'Frontend must not ask for an access code or password');
assert(app.includes("apiCall('lookup', { roll })"), 'Student lookup should use roll number only');
assert(app.includes("apiCall('special_login', { username: roll.toLowerCase() })"), 'Special accounts should be password-free');
const fn = fs.readFileSync(path.join(root, 'supabase/functions/quiz-api/index.ts'), 'utf8');
assert(!/STUDENT_ACCESS_CODE_HASH|ADMIN_PASSWORD_HASH|TEST_PASSWORD_HASH|verifyPasswordHash|body\.accessCode|body\.password/.test(fn), 'Edge Function must not validate user-entered access codes or passwords');
assert(fn.includes("['admin875', 'test34']"), 'Special account IDs must remain available');
assert(fn.includes('APP_SESSION_SECRET'), 'Internal HMAC session signing must remain enabled');
assert(!/correct:\s*['"](guided|unguided|simplex|half|full|single|burst)['"]/.test(app), 'Answer mapping must not be shipped in the frontend');
assert(!app.includes('ROUTE_CORRECT'), 'Canonical routing answer must not be shipped in the frontend');
const edges = [['A','B',2],['A','C',4],['B','D',2],['B','E',5],['C','D',3],['C','F',4],['D','F',4],['E','F',2]];
function dfs(node, route, cost, routes) {
  if (node === 'F') { routes.push({ route: [...route], cost, hops: route.length - 1 }); return; }
  for (const [a,b,w] of edges) {
    const next = a === node ? b : b === node ? a : null;
    if (next && !route.includes(next)) dfs(next, [...route, next], cost + w, routes);
  }
}
const routes=[]; dfs('A',['A'],0,routes); routes.sort((a,b)=>a.cost-b.cost || a.hops-b.hops);
assert.deepEqual(routes[0], { route:['A','C','F'], cost:8, hops:2 });
assert.match(fs.readFileSync(path.join(root,'vercel.json'),'utf8'), /"headers"/);
assert(fs.existsSync(path.join(root,'supabase/functions/quiz-api/index.ts')));
console.log('QA passed: 61 unique seed records, manual additions, shortest route, no client-side answer-key mappings, password-free student/special-account flows, internal signed sessions, and Vercel/Edge Function scaffold.');
