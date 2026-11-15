import { createServer } from 'node:http';

export const FIXTURE_ORIGIN = 'http://127.0.0.1:54329';
export const EVENT_ID = '11111111-1111-4111-8111-111111111111';
export const PUBLIC_ID = 'qa-scroll-event';
export const GUEST_COUNT = 809;

const customer = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'qa-scroll@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2026-01-01T00:00:00Z',
};
const owner = {
  ...customer,
  id: '33333333-3333-4333-8333-333333333333',
  email: 'nisan.sinai5@gmail.com',
};

const event = {
  id: EVENT_ID,
  public_id: PUBLIC_ID,
  owner_user_id: customer.id,
  created_at: '2026-01-01T00:00:00Z',
  event_type: 'wedding',
  title: 'חתונת בדיקה',
  hosts_names: 'משפחות בדיקה',
  honoree_display_name: 'אור וטל',
  event_date: '2030-06-01',
  ceremony_time: '19:45:00',
  reception_time: '18:30:00',
  venue_name: 'אולם דוגמה',
  address: 'כתובת לצורכי בדיקה',
  waze_url: 'https://www.waze.com/live-map/',
  google_maps_url: 'https://maps.google.com/',
  gift_url: null,
  contact_phone: null,
  description: 'אירוע בדיקה אוטומטי',
  side_a_label: null,
  side_b_label: null,
  brand_primary_color: '#722539',
  brand_accent_color: '#e9c892',
  brand_logo_url: null,
  invitation_style: 'classic',
  expected_guests: 900,
  is_active: true,
};

const guests = Array.from({ length: GUEST_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    id: `44444444-4444-4444-8444-000000000${number}`,
    event_id: EVENT_ID,
    full_name: `מוזמן ${number}`,
    phone: `0500000${number}`,
    phone_normalized: `+972500000${number}`,
    email: null,
    party_size: (index % 4) + 1,
    table_name: index % 2 ? 'משפחת הכלה · שולחן מיוחד לאורחים' : null,
    seat_number: null,
    family_side: null,
    notes: null,
    checked_in_at: null,
    invite_link_issued_at: null,
    invite_first_opened_at: null,
    invite_last_opened_at: null,
    invite_open_count: 0,
    invite_last_response_at: null,
    invite_last_response_status: null,
    is_active: true,
    token_revoked_at: null,
  };
});

function authToken(user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1_000) + 3_600;
  const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp })}.cWE`;
  return { access_token: jwt, refresh_token: 'fixture-session', expires_at: exp, user };
}

/** Only the loopback fixture accepts these synthetic sessions. */
export function fixtureCookie(baseURL, role = 'customer') {
  const session = authToken(role === 'owner' ? owner : customer);
  return {
    name: 'sb-127-auth-token',
    value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
    url: baseURL,
  };
}

export function startScrollFixture() {
  const readBody = async (request) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  };

  createServer(async (request, response) => {
    const { pathname, searchParams } = new URL(request.url, FIXTURE_ORIGIN);
    const json = (data, status = 200) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(data));
    };
    const one = request.headers.accept?.includes('vnd.pgrst.object');
    if (pathname === '/health') return json({ ready: true });
    if (pathname === '/auth/v1/user') {
      const token = request.headers.authorization?.split(' ')[1];
      const encoded = token?.split('.')[1];
      const subject = encoded ? JSON.parse(Buffer.from(encoded, 'base64url').toString()).sub : '';
      return json(subject === owner.id ? owner : customer);
    }
    if (pathname === '/auth/v1/admin/users') return json({ users: [customer, owner] });
    if (pathname === '/auth/v1/token') {
      const body = await readBody(request);
      return json(authToken(body.email === owner.email ? owner : customer));
    }
    if (pathname === '/rest/v1/rpc/get_public_event_by_public_id') {
      return json((await readBody(request)).p_public_id === PUBLIC_ID ? event : null);
    }
    if (pathname === '/rest/v1/rpc/get_public_event_branding') return json(null);
    if (pathname === '/rest/v1/rpc/consume_rate_limit') return json([{ allowed: true }]);
    if (pathname === '/rest/v1/rpc/submit_rsvp') return json({ outcome: 'created' });
    if (request.method === 'HEAD') {
      response.writeHead(200, { 'content-range': '*/0' });
      return response.end();
    }
    if (request.method !== 'GET') return json(null);
    if (pathname === '/rest/v1/events') {
      return json(searchParams.has('id') ? (one ? event : [event]) : [event]);
    }
    if (pathname === '/rest/v1/guests') {
      const id = searchParams.get('id')?.replace(/^eq\./, '');
      if (id) {
        const match = guests.find((guest) => guest.id === id);
        return json(one ? (match ?? null) : match ? [match] : []);
      }
      return json(guests);
    }
    return json(one ? null : []);
  }).listen(Number(new URL(FIXTURE_ORIGIN).port), '127.0.0.1');
}
