'use client';

import Link from 'next/link';
import { useId, useState, type PointerEvent } from 'react';

import { Icon } from '@/components/ui/icons';
import type { Dictionary } from '@/config/dictionary';
import type { Locale } from '@/lib/i18n';

import styles from './InvitationLetter.module.css';

/**
 * A real invitation-like interaction, not a fake customer RSVP.
 * The letter is visible and readable at first paint. Its paper folds shut or opens
 * with the seal button, and fine-pointer devices get a restrained parallax tilt.
 * Every animation is optional under prefers-reduced-motion.
 */
export function InvitationLetter({
  locale,
  preview,
}: {
  locale: Locale;
  preview: Dictionary['landing']['invitationPreview'];
}) {
  const [opened, setOpened] = useState(true);
  const detailsId = useId();
  const isHebrew = locale === 'he';

  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--letter-rotate-x', `${(-y * 2.3).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--letter-rotate-y', `${(x * 2.3).toFixed(2)}deg`);
  }

  function resetPointer(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty('--letter-rotate-x');
    event.currentTarget.style.removeProperty('--letter-rotate-y');
  }

  return (
    <div
      data-testid="sample-invite-card"
      data-state={opened ? 'open' : 'closed'}
      className={styles.scene}
      onPointerMove={followPointer}
      onPointerLeave={resetPointer}
    >
      <div className={styles.paper}>
        <div className={styles.innerBorder} aria-hidden="true" />
        <div className={styles.shimmer} aria-hidden="true" />

        <div className={styles.topline}>
          <span className={styles.sample}>
            <Icon name="sparkles" className={styles.sampleIcon} />
            {isHebrew ? 'הזמנה דיגיטלית לדוגמה' : 'Sample digital invitation'}
          </span>
          <span className={styles.littleStar} aria-hidden="true">
            ✧
          </span>
        </div>

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.dividerLine} />
          <span>✦</span>
          <span className={styles.dividerLine} />
        </div>

        <p className={styles.blessing}>{preview.blessing}</p>
        <p className={styles.intro}>{preview.introFirstLine}</p>
        <p className={styles.invitation}>{preview.introSecondLine}</p>
        <p className={styles.occasion}>{preview.occasion}</p>

        <div
          id={detailsId}
          data-testid="letter-details"
          className={styles.details}
          aria-hidden={!opened}
          inert={!opened}
        >
          <div className={styles.detailsInner}>
            <div className={styles.dateDivider} aria-hidden="true">
              <span />
              <span>✧</span>
              <span />
            </div>
            <dl className={styles.information}>
              <div className={styles.infoCell}>
                <dt>{preview.dateLabel}</dt>
                <dd>{preview.dateValue}</dd>
              </div>
              <div className={styles.infoCell}>
                <dt>{preview.timeLabel}</dt>
                <dd>{preview.timeValue}</dd>
              </div>
              <div className={styles.infoCell}>
                <dt>{preview.placeLabel}</dt>
                <dd>{preview.placeValue}</dd>
              </div>
            </dl>
            <Link href="#demo" className={styles.demoLink}>
              {isHebrew ? 'נסו להשיב להזמנה' : 'Try replying to the invitation'}
              <Icon name="arrow-forward" className={styles.linkIcon} />
            </Link>
          </div>
        </div>

        <button
          type="button"
          className={styles.sealButton}
          aria-expanded={opened}
          aria-controls={detailsId}
          aria-label={
            isHebrew
              ? opened
                ? 'סגירת המכתב לדוגמה'
                : 'פתיחת המכתב לדוגמה'
              : opened
                ? 'Fold the sample invitation'
                : 'Open the sample invitation'
          }
          onClick={() => setOpened((value) => !value)}
        >
          <span className={styles.seal} aria-hidden="true">
            <span>✦</span>
          </span>
          <span className={styles.sealLabel}>
            {isHebrew
              ? opened
                ? 'קפלו את המכתב'
                : 'פתחו את המכתב'
              : opened
                ? 'Fold the letter'
                : 'Open the letter'}
          </span>
          <Icon name={opened ? 'chevron-up' : 'chevron-down'} className={styles.chevron} />
        </button>
      </div>
      <div className={styles.orbit} aria-hidden="true">
        ✧
      </div>
      <p className={styles.footnote}>
        {isHebrew
          ? 'להמחשה בלבד · אפשר לפתוח ולסגור את המכתב'
          : 'Illustrative preview · open and fold the letter'}
      </p>
    </div>
  );
}
