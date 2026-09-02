import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

import './unit.setup';

/**
 * How long `waitFor` and `findBy*` may wait before giving up.
 *
 * Testing Library defaults to one second, and that is too tight for what these tests
 * actually wait on: a Server Action promise resolving and React re-rendering from it. On
 * an idle machine it takes a few milliseconds, so the default never shows — the suite was
 * green in eight consecutive runs.
 *
 * Under load it is a different number. Running the suite while four headless browsers
 * scrolled the site in parallel — roughly what a busy CI runner looks like — reproduced it
 * at **two failures in four runs**, four or five tests each, every one of them a `waitFor`
 * expiring rather than an assertion that was wrong. Nothing was broken; the wait was
 * simply shorter than the work.
 *
 * Five seconds is still well inside the 30-second test timeout, so a genuinely hung
 * assertion still fails as a failure rather than as a timeout of the whole file. Set here
 * rather than at the five call sites because the next async assertion someone writes
 * should not have to know this.
 */
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
});
