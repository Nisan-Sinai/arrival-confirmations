'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assertPlatformOwner } from '@/app/_lib/platformAdmin';
import { createPrivilegedClient } from '@/lib/server/supabase';

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function adminCustomersPath(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/admin/events?${search.toString()}`;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function adminCreateCustomerAction(formData: FormData): Promise<void> {
  const admin = await assertPlatformOwner();
  const email = text(formData.get('email')).toLowerCase();
  const passwordEntry = formData.get('password');
  const password = typeof passwordEntry === 'string' ? passwordEntry : '';

  if (!validEmail(email)) {
    redirect(adminCustomersPath({ error: 'customer-email' }));
  }
  if (password.length < 8 || password.length > 128) {
    redirect(adminCustomersPath({ error: 'customer-password' }));
  }

  const privileged = createPrivilegedClient();
  const { data, error } = await privileged.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || data.user === null) {
    const { data: usersData } = await privileged.auth.admin.listUsers({ page: 1, perPage: 1_000 });
    const alreadyExists = (usersData?.users ?? []).some(
      (user) => user.email?.toLowerCase() === email,
    );
    redirect(adminCustomersPath({ error: alreadyExists ? 'customer-exists' : 'customer-create' }));
  }

  if (typeof data.user.email_confirmed_at !== 'string') {
    await privileged.auth.admin.deleteUser(data.user.id);
    redirect(adminCustomersPath({ error: 'customer-confirm' }));
  }

  const { error: auditError } = await privileged.from('audit_logs').insert({
    admin_user_id: admin.id,
    action: 'admin_customer_created',
    entity_type: 'auth_user',
    entity_id: data.user.id,
    metadata: {
      email,
      emailConfirmed: true,
    },
  });

  if (auditError) {
    await privileged.auth.admin.deleteUser(data.user.id);
    throw new Error(`Admin customer audit write failed: ${auditError.code}`);
  }

  revalidatePath('/admin/events');
  redirect(adminCustomersPath({ saved: 'customer-created' }));
}
