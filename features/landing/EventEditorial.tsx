import Image from 'next/image';
import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BrandMark } from '@/features/layout/BrandMark';
import { localePath, type Locale } from '@/lib/i18n';
import { supportWhatsAppUrl } from '@/lib/supportContact';

const COPY = {
  he: {
    eyebrow: 'פחות התעסקות. יותר רגעים יפים.',
    title: 'אתם מתכננים את השמחה. המוזמנים כבר מסודרים.',
    lead: 'רשימות, הודעות ותשובות מפוזרות גוזלות זמן דווקא כשיש כל כך הרבה על הראש. כאן כל שלב ברור — מההזמנה הראשונה ועד הסיכום לקראת האירוע.',
    features: [
      {
        icon: 'send' as const,
        title: 'הזמנה אישית לכל מוזמן',
        description: 'קישור שנפתח מהוואטסאפ בלי להוריד אפליקציה.',
      },
      {
        icon: 'users' as const,
        title: 'יודעים מי מגיע',
        description: 'עוקבים אחר אישורים, התלבטויות ומספר משתתפים.',
      },
      {
        icon: 'dashboard' as const,
        title: 'מידע מסודר בזמן אמת',
        description: 'כל התשובות, ההערות וההעדפות בתצוגה אחת.',
      },
      {
        icon: 'download' as const,
        title: 'יוצאים לאירוע עם רשימה מוכנה',
        description: 'אפשר לייצא את הנתונים ולשתף עם מי שצריך.',
      },
    ],
    imageAlt: 'צילום להמחשה של מקום אירועים מעוצב עם שולחנות ערוכים',
    imageCaption: 'צילום להמחשה · אווירת אירוע',
    imageQuote: 'יותר נוכחים ברגע. פחות ברשימות.',
    link: 'נסו את המערכת בעצמכם',
    founderEyebrow: 'לא רק תוכנה. יש גם כתובת.',
    founderTitle: 'שאלות לפני שמתחילים? דברו עם מי שבנה את המערכת.',
    founderBody:
      'אישורי הגעה היא מערכת של ניסן סיני טכנולוגיות. אפשר להתנסות בחינם, לראות בדיוק מה מקבלים, וליצור קשר ישיר לשאלות או להתאמה.',
    founderCta: 'שלחו לנו הודעה',
    founderNote: 'אין צורך להשאיר פרטים כדי לשאול שאלה.',
    founderMessage: 'היי ניסן, ראיתי את מערכת אישורי ההגעה ויש לי שאלה לפני שמתחילים.',
  },
  en: {
    eyebrow: 'Less organising. More celebrating.',
    title: 'Focus on the celebration. Your guest list stays organised.',
    lead: 'Guest lists, replies and message threads take time away from the moments that matter. Keep each step clear, from the first invitation to your final guest count.',
    features: [
      {
        icon: 'send' as const,
        title: 'A personal invitation link',
        description: 'Guests open it from WhatsApp without installing an app.',
      },
      {
        icon: 'users' as const,
        title: 'Know who is coming',
        description: 'Track confirmed, undecided and expected guest counts.',
      },
      {
        icon: 'dashboard' as const,
        title: 'One live overview',
        description: 'Replies, notes and preferences together in one place.',
      },
      {
        icon: 'download' as const,
        title: 'An organised list for your event',
        description: 'Export the details when you need to share them.',
      },
    ],
    imageAlt: 'Illustrative photo of a beautifully decorated event venue with set tables',
    imageCaption: 'Illustrative event photograph',
    imageQuote: 'More time in the moment. Less time in spreadsheets.',
    link: 'Try it for yourself',
    founderEyebrow: 'A real person behind the product.',
    founderTitle: 'Questions before you start? Talk to the maker.',
    founderBody:
      'Arrival Confirmations is made by Nisan Sinai Technologies. Try it free, explore exactly what it offers, or get in touch directly if you have questions.',
    founderCta: 'Send us a message',
    founderNote: 'No form required just to ask a question.',
    founderMessage:
      'Hi Nisan, I saw Arrival Confirmations and have a question before getting started.',
  },
} as const;

/**
 * Editorial photo/story rather than another grid of generic marketing cards.
 * Image is locally hosted, licensed stock photography with explicit illustrative
 * captioning. No customer image, review or event success statistic is implied.
 */
export function EventEditorial({ locale }: { locale: Locale }) {
  const copy = COPY[locale];

  return (
    <>
      <section
        id="benefits"
        aria-labelledby="editorial-heading"
        className="scroll-mt-24 bg-[#f8f5f0] py-20 sm:py-28"
      >
        <Container width="wide">
          <div className="grid items-center gap-12 lg:grid-cols-[1.03fr_0.97fr] lg:gap-20">
            <div>
              <p className="mb-4 flex items-center gap-3 text-sm font-bold text-[#785130]">
                <span aria-hidden="true" className="h-px w-8 bg-[#b99161]" />
                {copy.eyebrow}
              </p>
              <h2
                id="editorial-heading"
                className="font-[family-name:var(--font-display)] text-[clamp(2rem,3.5vw,3.8rem)] leading-[1.15] font-bold tracking-tight text-[#452832]"
              >
                {copy.title}
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#695c5b] sm:text-lg">
                {copy.lead}
              </p>

              <ul className="mt-9 divide-y divide-[#dfd4ca] border-y border-[#dfd4ca]">
                {copy.features.map((feature) => (
                  <li key={feature.title} className="group flex items-start gap-4 rounded-xl py-5 transition-colors duration-300 hover:bg-white/55">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#633848] shadow-sm ring-1 ring-[#eaded3] transition-transform duration-300 motion-safe:group-hover:rotate-[-6deg] motion-safe:group-hover:scale-[1.08]"
                    >
                      <Icon name={feature.icon} className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#452832]">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#695c5b]">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href={localePath(locale, '/signup')}
                className={buttonClass({ className: 'mt-8', size: 'lg' })}
              >
                {copy.link}
                <Icon name="arrow-forward" className="size-4" />
              </Link>
            </div>

            <div className="relative min-w-0">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-[2rem] border border-[#d4b899] sm:-inset-5"
              />
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#d9c8b4] shadow-[0_24px_70px_-25px_rgba(67,38,41,0.35)] sm:aspect-[5/6]">
                <Image
                  src="/media/event-interior.webp"
                  alt={copy.imageAlt}
                  fill
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  className="object-cover transition-transform duration-[1200ms] ease-out motion-safe:group-hover:scale-[1.045]"
                  loading="lazy"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#251c1b]/80 via-[#251c1b]/10 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
                  <span aria-hidden="true" className="mb-5 block h-px w-16 bg-[#e9cf9e]" />
                  <p className="max-w-sm font-[family-name:var(--font-display)] text-3xl leading-tight font-bold sm:text-4xl">
                    {copy.imageQuote}
                  </p>
                  <p className="mt-5 text-xs text-white/80">{copy.imageCaption}</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="founder-heading" className="bg-white py-14 sm:py-20">
        <Container width="wide">
          <div className="flex flex-col gap-8 rounded-[1.75rem] border border-[#e4d8c8] bg-[linear-gradient(110deg,#fbf6ed,#ffffff)] p-7 shadow-[0_10px_40px_-24px_rgba(67,38,41,0.24)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl items-start gap-5">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#543040] font-[family-name:var(--font-display)] text-lg font-bold text-[#f0d7a7]"
              >
                <BrandMark className="size-8 !text-[#efd7a9]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#805635]">{copy.founderEyebrow}</p>
                <h2
                  id="founder-heading"
                  className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight font-bold text-[#452832] sm:text-3xl"
                >
                  {copy.founderTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#695c5b] sm:text-base">
                  {copy.founderBody}
                </p>
              </div>
            </div>
            <div className="shrink-0 lg:text-center">
              <a
                href={supportWhatsAppUrl(copy.founderMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ size: 'lg', className: 'w-full sm:w-auto' })}
              >
                <Icon name="whatsapp" className="size-5" /> {copy.founderCta}
                <span className="sr-only">
                  {locale === 'he' ? ' (נפתח בחלון חדש)' : ' (Opens in a new window)'}
                </span>
              </a>
              <p className="mt-3 text-center text-xs text-[#746563]">{copy.founderNote}</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
