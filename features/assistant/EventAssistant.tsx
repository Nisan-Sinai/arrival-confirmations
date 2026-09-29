'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { Icon } from '@/components/ui/icons';
import type { AssistantLink, AssistantContext } from '@/features/assistant/productGuide';
import type { Locale } from '@/lib/i18n';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  links?: AssistantLink[];
  local?: boolean;
};

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
  const eventId = pathname?.match(/^\/dashboard\/events\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  const context: AssistantContext =
    pathname?.includes('/guests') && eventId
      ? 'guests'
      : eventId
        ? 'event'
        : pathname?.includes('/e/') || pathname?.includes('/invite')
          ? 'invitation'
          : pathname?.endsWith('/pricing')
            ? 'pricing'
            : 'site';
  const suggestions =
    context === 'invitation'
      ? isHe
        ? ['איך מאשרים הגעה?', 'איך משנים תשובה?']
        : ['How do I RSVP?', 'Can I change my answer?']
      : eventId
        ? isHe
          ? ['כמה אישרו הגעה?', 'מי טרם ענה?', 'איך שולחים הזמנה אישית?']
          : ['How many replied?', 'Who has not replied?', 'How do I share a personal invite?']
        : isHe
          ? ['איך יוצרים אירוע?', 'איך שולחים הזמנה אישית?', 'כמה עולה?']
          : ['How do I create an event?', 'How do I share invites?', 'What does it cost?'];

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

  async function sendQuestion(question: string) {
    const content = question.trim();
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
          context,
          eventId,
          // A local event answer contains private host data. Never replay it or its
          // question into a later Gemini request as conversation history.
          messages: next.filter((message) => !message.local).slice(-7),
        }),
      });
      const data: {
        answer?: string;
        error?: string;
        links?: AssistantLink[];
        source?: 'event' | 'model';
      } = await response.json();
      if (!response.ok || !data.answer)
        throw new Error(data.error || (isHe ? 'לא התקבלה תשובה.' : 'No answer received.'));
      const local = data.source === 'event';
      setMessages([
        ...messages,
        { role: 'user', content, local },
        { role: 'assistant', content: data.answer, links: data.links, local },
      ]);
    } catch (cause) {
      setMessages(messages);
      setInput(content);
      setError(cause instanceof Error ? cause.message : isHe ? 'נסו שוב.' : 'Please try again.');
    } finally {
      setPending(false);
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(input);
  }

  return (
    <div className="fixed right-4 bottom-4 z-[var(--z-overlay)] flex flex-col items-end sm:right-6 sm:bottom-6 rtl:items-start">
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
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  {isHe ? 'איך אפשר לעזור?' : 'How can I help?'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      disabled={pending}
                      onClick={() => void sendQuestion(suggestion)}
                      className="border-border bg-secondary/60 text-secondary-foreground rounded-full border px-3 py-2 text-sm leading-snug hover:underline disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[92%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'bg-primary text-primary-foreground ms-auto' : 'bg-secondary text-secondary-foreground me-auto'}`}
              >
                <p>{message.content}</p>
                {message.links && message.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-current/15 pt-2 text-sm">
                    {message.links
                      .filter(({ href }) => href.startsWith('/') && !href.startsWith('//'))
                      .map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="font-semibold underline underline-offset-2"
                        >
                          {label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
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
                  ? 'שאלות כלליות נשלחות ל־Google AI. מידע על האירוע נבדק באתר בלבד. אל תכתבו כאן פרטי אורחים.'
                  : 'General questions go to Google AI. Event lookups stay on this site. Do not type guest details here.'}{' '}
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
        aria-label={
          isHe
            ? open
              ? 'סגירת עוזר AI'
              : 'פתיחת עוזר AI'
            : open
              ? 'Close AI assistant'
              : 'Open AI assistant'
        }
        className="bg-primary text-primary-foreground shadow-raised flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring] sm:h-12 sm:gap-2 sm:px-4"
      >
        <Icon name="sparkles" className="size-4 sm:size-5" />
        <span className="sm:hidden">AI</span>
        <span className="hidden sm:inline">{isHe ? 'שאלו את ה־AI' : 'Ask AI'}</span>
      </button>
    </div>
  );
}
