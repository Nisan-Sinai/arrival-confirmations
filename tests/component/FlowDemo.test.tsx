import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FlowDemo } from '@/features/landing/FlowDemo';

describe('FlowDemo', () => {
  it('keeps keyboard focus inside the open video dialog and restores the trigger', async () => {
    const user = userEvent.setup();
    render(<FlowDemo playLabel="Play demo" caption="Demo" closeLabel="Close demo" />);

    const trigger = screen.getByRole('button', { name: 'Play demo' });
    await user.click(trigger);

    const close = screen.getByRole('button', { name: 'Close demo' });
    const video = document.querySelector('video');
    expect(close).toHaveFocus();
    expect(video).not.toBeNull();

    await user.tab();
    expect(video).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
