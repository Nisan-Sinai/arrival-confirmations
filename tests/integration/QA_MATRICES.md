# QA matrices

The integration suite runs both persistent regression matrices against a fresh local Supabase database:

- 50 events with 1–50 guests, RSVPs, seating and tenant isolation.
- 20 unique users with 10 independently licensed events per user, covering Trial, Basic, Premium and Pro.

Every matrix runs inside a transaction that is rolled back. Production data is never used or modified.
