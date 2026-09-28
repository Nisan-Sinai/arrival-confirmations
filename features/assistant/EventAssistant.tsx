'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';

import type { Locale } from '@/lib/i18n';

type Message = { role: 'user' | 'assistant'; content: string };

export function EventAssistant({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const isHe = locale === 'he';

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          context: pathname?.includes('/dashboard/')
            ? 'event'
            : pathname?.includes('/e/') || pathname?.includes('/invite')
              ? 'invitation'
              : 'site',
          messages: next.slice(-7),
        }),
      });
      const data: { answer?: string; error?: string } = await response.json();
      if (!response.ok || !data.answer)
        throw new Error(data.error || (isHe ? 'לא התקבלה תשובה.' : 'No answer received.'));
      setMessages([...next, { role: 'assistant', content: data.answer }]);
    } catch (cause) {
      setMessages(messages);
      setInput(content);
      setError(cause instanceof Error ? cause.message : isHe ? 'נסו שוב.' : 'Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed end-4 bottom-4 z-[var(--z-overlay)] sm:end-6 sm:bottom-6">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={isHe ? 'עוזר AI לאישורי הגעה' : 'RSVP AI assistant'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          className="bg-card text-card-foreground border-border shadow-overlay mb-3 flex h-[min(36rem,calc(100dvh-6rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border"
        >
          <div className="bg-primary text-primary-foreground flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-base font-bold">
                {isHe ? 'עוזר AI לאישורי הגעה' : 'RSVP AI assistant'}
              </h2>
              <p className="text-sm opacity-85">
                {isHe
                  ? 'שאלו על הזמנות, מוזמנים ואישורי הגעה'
                  : 'Ask about invitations, guests and RSVPs'}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={isHe ? 'סגירת העוזר' : 'Close assistant'}
              className="rounded-full px-2 py-1 text-xl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              ×
            </button>
          </div>
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-3 overflow-y-auto p-4 text-base"
          >
            {messages.length === 0 && (
              <p className="text-muted-foreground leading-relaxed">
                {isHe
                  ? 'איך אפשר לעזור? למשל: איך שולחים הזמנה אישית או איך רואים מי אישר הגעה?'
                  : 'How can I help? For example: how do I share an invitation or see who replied?'}
              </p>
            )}
            {messages.map((message, index) => (
              <p
                key={index}
                className={`max-w-[92%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'bg-primary text-primary-foreground ms-auto' : 'bg-secondary text-secondary-foreground me-auto'}`}
              >
                {message.content}
              </p>
            ))}
            {pending && (
              <p className="text-muted-foreground" role="status">
                {isHe ? 'חושב…' : 'Thinking…'}
              </p>
            )}
          </div>
          <form onSubmit={send} className="border-border border-t p-3">
            {error && (
              <p role="alert" className="text-destructive mb-2 text-sm">
                {error}
              </p>
            )}
            <label htmlFor="assistant-question" className="sr-only">
              {isHe ? 'השאלה שלכם' : 'Your question'}
            </label>
            <textarea
              id="assistant-question"
              ref={inputRef}
              rows={2}
              maxLength={1200}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isHe ? 'כתבו שאלה על אישורי ההגעה…' : 'Ask about RSVPs…'}
              className="border-input bg-background w-full resize-none rounded-lg border p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--color-ring]"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs leading-snug">
                {isHe
                  ? 'השאלה נשלחת ל־Google AI. אל תכללו פרטים אישיים של אורחים.'
                  : 'Your question is sent to Google AI. Do not include guest personal data.'}{' '}
                <a className="underline" href={isHe ? '/privacy' : '/en/privacy'}>
                  {isHe ? 'פרטיות' : 'Privacy'}
                </a>
              </p>
              <button
                type="submit"
                disabled={!input.trim() || pending}
                className="bg-primary text-primary-foreground shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {isHe ? 'שליחה' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={isHe ? 'פתיחת עוזר AI' : 'Open AI assistant'}
        className="bg-primary text-primary-foreground shadow-raised rounded-full px-5 py-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]"
      >
        ✨ {isHe ? 'שאלו את ה־AI' : 'Ask AI'}
      </button>
    </div>
  );
}
