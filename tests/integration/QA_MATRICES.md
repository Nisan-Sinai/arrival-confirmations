# QA matrices

The integration suite runs both persistent regression matrices against a fresh local Supabase database:

- 50 events with 1–50 guests, RSVPs, seating and tenant isolation.
- 20 unique users with 10 independently licensed events per user, covering Trial, Basic, Premium and Pro.

Every matrix runs inside a transaction that is rolled back. Production data is never used or modified.

## Production release verification

On 2026-08-02, the Premium and Pro schema migrations were applied to Production and verified without data loss. The live database retained 201 events, 3,476 guests and 2,787 RSVPs, with RLS enabled on the new messaging and seating tables.
