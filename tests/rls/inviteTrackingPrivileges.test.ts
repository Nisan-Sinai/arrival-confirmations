import { describe, expect, it } from 'vitest';

import { withRollback } from '../setup/database.setup';

describe('personal invite tracking routine privileges', () => {
  it('allows only service_role to execute the SECURITY DEFINER tracking routines', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query<{
        anon_open: boolean;
        authenticated_open: boolean;
        service_open: boolean;
        anon_response: boolean;
        authenticated_response: boolean;
        service_response: boolean;
      }>(`
        select
          has_function_privilege(
            'anon',
            'public.record_guest_invite_open(uuid,uuid,uuid)',
            'EXECUTE'
          ) as anon_open,
          has_function_privilege(
            'authenticated',
            'public.record_guest_invite_open(uuid,uuid,uuid)',
            'EXECUTE'
          ) as authenticated_open,
          has_function_privilege(
            'service_role',
            'public.record_guest_invite_open(uuid,uuid,uuid)',
            'EXECUTE'
          ) as service_open,
          has_function_privilege(
            'anon',
            'public.record_guest_invite_response(uuid,uuid,public.attendance_status)',
            'EXECUTE'
          ) as anon_response,
          has_function_privilege(
            'authenticated',
            'public.record_guest_invite_response(uuid,uuid,public.attendance_status)',
            'EXECUTE'
          ) as authenticated_response,
          has_function_privilege(
            'service_role',
            'public.record_guest_invite_response(uuid,uuid,public.attendance_status)',
            'EXECUTE'
          ) as service_response
      `);

      expect(rows[0]).toEqual({
        anon_open: false,
        authenticated_open: false,
        service_open: true,
        anon_response: false,
        authenticated_response: false,
        service_response: true,
      });
    });
  });
});
