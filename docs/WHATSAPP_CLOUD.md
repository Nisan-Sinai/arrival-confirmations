# WhatsApp Business Cloud API

The dashboard can send invitations automatically from one platform-owned WhatsApp Business
number. The browser never receives the Meta access token and never opens the host's WhatsApp.

## Meta setup

1. Create or use a Meta Business Portfolio and add a WhatsApp Business Account.
2. Add the sender phone number and finish number verification.
3. Create four approved message templates with these body variables:
   - invitation: guest name, event title, personal RSVP URL
   - reminder: guest name, event title, personal RSVP URL
   - update: guest name, event title, update note, personal RSVP URL
   - thanks: guest name, event title
4. Create a permanent server token with permission to send WhatsApp messages.
5. Put the values below in Vercel Environment Variables. Never prefix them with
   `NEXT_PUBLIC_`.

## Required Vercel variables

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_TEMPLATE_INVITATION`
- `WHATSAPP_TEMPLATE_REMINDER`
- `WHATSAPP_TEMPLATE_UPDATE`
- `WHATSAPP_TEMPLATE_THANKS`

Optional:

- `WHATSAPP_LANGUAGE_CODE=he`
- `WHATSAPP_GRAPH_VERSION=v23.0`

Changing the sender later does not require a code change or redeploy. The platform owner opens `/admin/settings/whatsapp`, enters the replacement display number and Meta Phone Number ID, tests the Meta connection, and saves. The access token remains server-only in Vercel.

## Sending model

The client splits a campaign into batches of 20. The active sender Phone Number ID is loaded from the platform-owner admin settings, while the access token and approved template names remain server-only environment variables. Each batch is authenticated on the server,
validated against the event owner and license, and sent directly through Meta. Every row is written
to `event_messages` with a campaign id, provider message id and sent/failed status. Retrying the
same batch is idempotent for messages that already reached `sent`.

For invitation, reminder and update messages a fresh personal RSVP token is generated server-side.
Only its hash is stored; the raw token exists only long enough to place the personal URL into the
WhatsApp template payload.

Use the feature only for recipients who have consented to receive WhatsApp messages from the
business and keep the approved Meta template wording aligned with the variables above.
