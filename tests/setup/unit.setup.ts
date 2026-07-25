import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local', quiet: true });
loadDotenv({ path: '.env.test', quiet: true, override: true });

/**
 * Deterministic defaults so unit tests never depend on a developer's local secrets.
 * Values that a real deployment must supply are given obviously-fake stand-ins here;
 * anything that genuinely needs a live project belongs in tests/integration.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://unit-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'unit-test-anon-key-value-0123456789';
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'unit-test-service-role-key-0123456789';
process.env.TOKEN_PEPPER ??= 'unit-test-token-pepper-0123456789-abcdefghij';
process.env.IP_HASH_PEPPER ??= 'unit-test-ip-pepper-9876543210-zyxwvutsrq';
