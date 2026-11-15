import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FlowDemo } from '@/features/landing/FlowDemo';

describe('FlowDemo', () => {
  it('opens a native video dialog and restores the trigger when it closes', async ({
    onTestFinished,
  }) => {
    const prototype = HTMLDialogElement.prototype;
    const showModal = Object.getOwnPropertyDescriptor(prototype, 'showModal');
    const closeDialog = Object.getOwnPropertyDescriptor(prototype, 'close');
    // JSDOM does not implement native dialogs. The mobile browser tests cover the
    // real top layer, keyboard dismissal and prevention of background scrolling.
    Object.defineProperties(prototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.open = true;
        },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.open = false;
          this.dispatchEvent(new Event('close'));
        },
      },
    });
    onTestFinished(() => {
      if (showModal) Object.defineProperty(prototype, 'showModal', showModal);
      else Reflect.deleteProperty(prototype, 'showModal');
      if (closeDialog) Object.defineProperty(prototype, 'close', closeDialog);
      else Reflect.deleteProperty(prototype, 'close');
    });

    const user = userEvent.setup();
    render(<FlowDemo playLabel="Play demo" caption="Demo" closeLabel="Close demo" />);

    const trigger = screen.getByRole('button', { name: 'Play demo' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Play demo' });
    expect(dialog).toHaveAttribute('open');
    expect(dialog.querySelector('video')).toHaveAttribute('src', '/media/walkthrough.mp4');

    await user.click(screen.getByRole('button', { name: 'Close demo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
