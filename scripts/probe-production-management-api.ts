async function main(): Promise<void> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']?.trim();
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim();

  if (
    supabaseUrl === undefined ||
    serviceRoleKey === undefined ||
    supabaseUrl.includes('ci-placeholder')
  ) {
    console.info('Management API probe skipped outside the real Supabase environment.');
    return;
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  if (projectRef === undefined || projectRef.length < 10) {
    throw new Error('Unable to derive the Supabase project reference.');
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'select 1 as healthy', read_only: true }),
    },
  );

  console.info(`Management API service-role probe status: ${response.status}`);
  if (response.ok) {
    console.info('Management API accepted the existing service-role credential.');
    return;
  }

  const body = (await response.text()).slice(0, 300).replaceAll(serviceRoleKey, '[redacted]');
  console.info(`Management API rejected the service-role credential: ${body}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
