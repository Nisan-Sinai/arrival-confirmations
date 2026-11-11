import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { localePath, type Locale } from '@/lib/i18n';
import { encodeQr, qrSvgPath, qrViewBoxSize } from '@/lib/qr';
import { absoluteUrl } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * What the product does, shown rather than listed.
 *
 * This replaces two grids of icon-and-paragraph cards — seven boxes that each named a
 * capability and showed none of them. A visitor comparing RSVP tools is looking for the
 * thing itself: what the message looks like in WhatsApp, what the host sees, whether
 * there is a seating plan. Each tile here carries a small drawing of the real screen it
 * describes, so the page can be understood by someone who reads no paragraph at all.
 *
 * Three rules the tiles keep:
 *
 *   - **Every drawing is markup, not an image.** Nothing to download, nothing to shift
 *     the layout when it arrives, and it stays sharp on any screen — the same reasons the
 *     invitation's own ornaments are inline SVG.
 *   - **The drawings are decoration.** Each is `aria-hidden`; the heading and paragraph
 *     under it say everything the picture does, so a screen reader hears the feature
 *     once rather than a list of mock guest names.
 *   - **A capability that depends on a plan says so.** The seating studio is Pro and the
 *     personal links are Premium; a tile that implied otherwise would be the page making
 *     a promise the price list then takes back.
 */

type TileCopy = { readonly title: string; readonly body: string; readonly plan: string };

type BentoCopy = {
  readonly personal: TileCopy;
  readonly qr: TileCopy;
  readonly seating: TileCopy;
  readonly lists: TileCopy;
  readonly privacy: { readonly title: string; readonly points: readonly [string, string, string] };
  readonly everyPlan: string;
  /** Words inside the drawings. Decorative, but translated — never Hebrew on an English page. */
  readonly art: {
    readonly sent: string;
    readonly inviteLine: string;
    readonly occasion: string;
    readonly names: string;
    readonly date: string;
    readonly attending: string;
    readonly maybe: string;
    readonly declined: string;
    readonly guests: readonly [string, string, string];
    readonly statuses: readonly [string, string, string];
    readonly scan: string;
    readonly table: string;
    readonly hebrewDate: string;
    readonly calendar: string;
    readonly columns: readonly [string, string, string];
    readonly rows: readonly (readonly [string, string, string])[];
  };
};

const COPY: Record<Locale, BentoCopy> = {
  he: {
    personal: {
      title: 'קישור אישי לכל מוזמן',
      body: 'הודעה מוכנה לכל אורח, נשלחת מה-WhatsApp שלכם. רואים מי פתח את ההזמנה, מי ענה ולמי כדאי לשלוח תזכורת.',
      plan: 'Premium · Pro',
    },
    qr: {
      title: 'קוד QR להזמנה מודפסת',
      body: 'מדפיסים את הקוד על ההזמנה או על שלט בכניסה, והאורחים סורקים ומאשרים הגעה מהטלפון.',
      plan: 'בכל המסלולים',
    },
    seating: {
      title: 'סידורי הושבה',
      body: 'מפת שולחנות ומושבים ב-Premium, וסטודיו הושבה עם אזורים, קיבולת והושבה אוטומטית ב-Pro.',
      plan: 'Premium · Pro',
    },
    lists: {
      title: 'ייבוא וייצוא רשימות',
      body: 'מייבאים Excel, CSV או TSV — כולל שולחן, מושב, צד ומנה — ומייצאים רשימה מסודרת לאולם ולקייטרינג.',
      plan: 'Premium · Pro',
    },
    privacy: {
      title: 'פרטיות כברירת מחדל',
      points: [
        'עמודי ההזמנה אינם מופיעים במנועי חיפוש',
        'בלי פרסומות ובלי העברת מידע לצורכי שיווק',
        'פרטי האורחים נמחקים אוטומטית בתום תקופת השמירה',
      ],
    },
    everyPlan: 'בכל המסלולים',
    art: {
      sent: 'נשלח',
      inviteLine: 'שמחים להזמינכם לחתונה של',
      occasion: 'חתונה',
      names: 'נועה ואיתי',
      date: 'י״ד באלול · 19:00',
      attending: 'מגיעים',
      maybe: 'מתלבטים',
      declined: 'לא מגיעים',
      guests: ['משפחת לוי', 'דנה ויואב', 'סבתא רחל'],
      statuses: ['אישרו הגעה', 'נפתח', 'נשלח'],
      scan: 'סרקו לאישור הגעה',
      table: 'שולחן',
      hebrewDate: 'ביום חמישי · י״ד באלול תשפ״ו',
      calendar: 'הוספה ליומן',
      columns: ['שם', 'שולחן', 'מנה'],
      rows: [
        ['משפחת כהן', '4', 'רגילה'],
        ['מיכל ואורי', '7', 'צמחונית'],
        ['דוד אבי', '2', 'ללא גלוטן'],
      ],
    },
  },
  en: {
    personal: {
      title: 'A personal link for every guest',
      body: 'A prepared message for each guest, sent from your own WhatsApp. See who opened the invitation, who replied and who needs a reminder.',
      plan: 'Premium · Pro',
    },
    qr: {
      title: 'A QR code for printed invitations',
      body: 'Print the code on the invitation or on a sign at the door, and guests scan it to reply from their phone.',
      plan: 'Every plan',
    },
    seating: {
      title: 'Seating plans',
      body: 'A tables-and-seats map on Premium, and a seating studio with zones, capacity and automatic seating on Pro.',
      plan: 'Premium · Pro',
    },
    lists: {
      title: 'Import and export your lists',
      body: 'Import Excel, CSV or TSV — with table, seat, side and meal — and export a tidy list for the venue and the caterer.',
      plan: 'Premium · Pro',
    },
    privacy: {
      title: 'Private by default',
      points: [
        'Invitation pages are kept out of search engines',
        'No advertising and no data passed on for marketing',
        'Guest details are deleted automatically when retention ends',
      ],
    },
    everyPlan: 'Every plan',
    art: {
      sent: 'Sent',
      inviteLine: 'We joyfully invite you to the wedding of',
      occasion: 'Wedding',
      names: 'Noa & Itay',
      date: '14 Elul · 19:00',
      attending: 'Attending',
      maybe: 'Undecided',
      declined: 'Declined',
      guests: ['The Levi family', 'Dana & Yoav', 'Grandma Rachel'],
      statuses: ['Confirmed', 'Opened', 'Sent'],
      scan: 'Scan to reply',
      table: 'Table',
      hebrewDate: 'Thursday · 14 Elul 5786',
      calendar: 'Add to calendar',
      columns: ['Name', 'Table', 'Meal'],
      rows: [
        ['The Cohen family', '4', 'Standard'],
        ['Michal & Uri', '7', 'Vegetarian'],
        ['Uncle Avi', '2', 'Gluten-free'],
      ],
    },
  },
};

/** The small pill under a tile that says which plans carry the feature. */
function PlanTag({ children }: { children: ReactNode }) {
  return (
    <span className="border-accent-strong/30 bg-accent-soft/50 text-accent-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold">
      <span aria-hidden="true" className="bg-accent-strong size-1.5 rounded-full" />
      {children}
    </span>
  );
}

function Tile({
  icon,
  title,
  body,
  plan,
  className,
  artClassName,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  plan: string;
  className?: string;
  artClassName?: string;
  children: ReactNode;
}) {
  return (
    <article
      /*
       * `overflow-clip`, not `overflow-hidden`. The tile reveals itself on scroll, and
       * `hidden` would make it a scroll container for anything inside that ever measures
       * against the viewport — the trap the note in `globals.css` describes at length.
       */
      className={cn(
        'reveal border-border bg-card shadow-paper flex flex-col overflow-clip rounded-3xl border',
        'transition-[box-shadow,translate] duration-[--duration-base] ease-[--ease-out]',
        'hover:shadow-raised hover:-translate-y-1',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'bento-art border-border/70 relative flex h-44 items-center justify-center overflow-clip border-b px-5 sm:h-48',
          artClassName,
        )}
      >
        {children}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="border-accent-strong/30 bg-accent-soft/50 text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-xl border"
          >
            <Icon name={icon} className="size-5" />
          </span>
          <h3 className="text-primary text-xl leading-snug font-semibold">{title}</h3>
        </div>
        <p className="text-muted-foreground mt-3 flex-1 leading-relaxed">{body}</p>
        <p className="mt-5">
          <PlanTag>{plan}</PlanTag>
        </p>
      </div>
    </article>
  );
}

/** The invitation as it lands in a WhatsApp thread: a link preview inside a bubble. */
function InvitationArt({ art }: { art: BentoCopy['art'] }) {
  return (
    <div className="flex w-full max-w-md items-end justify-center gap-4">
      <div className="bg-success-soft border-success/20 w-full max-w-64 rounded-2xl rounded-ee-md border p-2 shadow-[0_10px_30px_-18px_rgba(40,60,40,0.45)]">
        <div className="border-accent/40 bg-card rounded-xl border px-4 py-3 text-center">
          <p className="text-accent-strong text-[11px] font-bold tracking-widest">✦</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{art.inviteLine}</p>
          <p className="text-primary mt-1 font-[family-name:var(--font-display)] text-xl font-bold">
            {art.names}
          </p>
          <p className="text-primary/80 mt-1.5 text-[11px] font-semibold">{art.date}</p>
        </div>
        <p className="text-success mt-1.5 flex items-center justify-end gap-1 px-1 text-[10px] font-semibold">
          {art.sent}
          <Icon name="check" strokeWidth={2.4} className="size-3" />
        </p>
      </div>
      <div className="hidden shrink-0 flex-col gap-2 pb-2 sm:flex">
        {[art.attending, art.maybe, art.declined].map((label, index) => (
          <span
            key={label}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap',
              index === 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border-strong bg-card text-primary',
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The host's view: three figures and the replies as one segmented bar. */
function DashboardArt({ art }: { art: BentoCopy['art'] }) {
  const stats = [
    { label: art.attending, value: '128', tone: 'text-success' },
    { label: art.maybe, value: '14', tone: 'text-accent-strong' },
    { label: art.declined, value: '9', tone: 'text-destructive' },
  ];
  return (
    <div className="w-full max-w-64">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-border bg-card rounded-xl border px-2 py-2.5 text-center"
          >
            <p
              className={cn(
                'font-[family-name:var(--font-display)] text-xl leading-none font-bold tabular-nums',
                stat.tone,
              )}
            >
              {stat.value}
            </p>
            <p className="text-muted-foreground mt-1.5 text-[10px] font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-border/70 mt-3 flex h-2 overflow-hidden rounded-full">
        <span className="bg-success h-full w-[85%]" />
        <span className="bg-accent-strong h-full w-[9%]" />
        <span className="bg-destructive/80 h-full w-[6%]" />
      </div>
    </div>
  );
}

/** A send list: three guests, three stages of the same personal link. */
function PersonalLinksArt({ art }: { art: BentoCopy['art'] }) {
  const tones = [
    'bg-success-soft text-success',
    'bg-accent-soft text-accent-foreground',
    'bg-secondary text-secondary-foreground',
  ];
  return (
    <ul className="w-full max-w-64 space-y-2">
      {art.guests.map((guest, index) => (
        <li
          key={guest}
          className="border-border bg-card flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
        >
          <span className="text-primary flex min-w-0 items-center gap-2 text-xs font-semibold">
            <span className="bg-secondary text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {guest.replace(/^The /, '').slice(0, 1)}
            </span>
            <span className="truncate">{guest}</span>
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
              tones[index],
            )}
          >
            {art.statuses[index]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A real, scannable code — it opens this site's home page.
 *
 * Drawn by the same encoder the event page uses for an invitation link, so the tile is a
 * sample of the feature rather than a picture of one.
 */
function QrArt({ locale, caption }: { locale: Locale; caption: string }) {
  const qr = encodeQr(absoluteUrl(localePath(locale, '/')));
  const size = qrViewBoxSize(qr);
  return (
    <div className="flex items-center gap-4">
      <div className="border-accent/50 bg-card rounded-2xl border p-2 shadow-[0_10px_30px_-18px_rgba(60,30,30,0.5)]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="text-primary size-24 sm:size-28"
          shapeRendering="crispEdges"
        >
          <path d={qrSvgPath(qr)} fill="currentColor" />
        </svg>
      </div>
      <p className="text-primary max-w-20 text-xs leading-snug font-semibold">{caption}</p>
    </div>
  );
}

/** A corner of a hall: three round tables, one of them picked out. */
function SeatingArt({ label }: { label: string }) {
  const tables = [
    { cx: 52, cy: 54, n: 4, active: false },
    { cx: 138, cy: 46, n: 7, active: true },
    { cx: 224, cy: 58, n: 2, active: false },
  ];
  return (
    <svg viewBox="0 0 276 108" className="w-full max-w-72" role="presentation">
      {tables.map((table) => (
        <g key={table.n}>
          {Array.from({ length: 8 }, (_, seat) => {
            const angle = (seat / 8) * Math.PI * 2;
            return (
              <circle
                key={seat}
                cx={(table.cx + Math.cos(angle) * 34).toFixed(2)}
                cy={(table.cy + Math.sin(angle) * 34).toFixed(2)}
                r="4.5"
                className={
                  table.active
                    ? seat < 6
                      ? 'fill-accent-strong'
                      : 'fill-accent-soft stroke-accent-strong'
                    : 'fill-secondary stroke-border-strong'
                }
                strokeWidth="1"
              />
            );
          })}
          <circle
            cx={table.cx}
            cy={table.cy}
            r="24"
            className={
              table.active
                ? 'fill-accent-soft stroke-accent-strong'
                : 'fill-card stroke-border-strong'
            }
            strokeWidth="1.4"
          />
          <text
            x={table.cx}
            y={table.cy - 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="7.5"
          >
            {label}
          </text>
          <text
            x={table.cx}
            y={table.cy + 11}
            textAnchor="middle"
            className="fill-primary"
            fontSize="12"
            fontWeight="700"
          >
            {table.n}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** A spreadsheet arriving as a guest list: the columns the importer actually reads. */
function ListsArt({ art }: { art: BentoCopy['art'] }) {
  return (
    <div className="flex w-full max-w-sm items-center gap-3">
      <div className="flex shrink-0 flex-col gap-1.5">
        {['XLSX', 'CSV', 'TSV'].map((format) => (
          <span
            key={format}
            className="border-success/25 bg-success-soft text-success rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide"
          >
            {format}
          </span>
        ))}
      </div>
      <Icon name="arrow-forward" className="text-accent-strong size-4 shrink-0" />
      <div className="border-border bg-card min-w-0 flex-1 overflow-hidden rounded-xl border text-[10px]">
        <div className="bg-secondary/60 text-primary grid grid-cols-[1.6fr_0.7fr_1fr] gap-2 px-3 py-1.5 font-bold">
          {art.columns.map((column) => (
            <span key={column} className="truncate">
              {column}
            </span>
          ))}
        </div>
        {art.rows.map((row) => (
          <div
            key={row[0]}
            className="border-border/70 text-muted-foreground grid grid-cols-[1.6fr_0.7fr_1fr] gap-2 border-t px-3 py-1.5"
          >
            <span className="text-primary truncate font-semibold">{row[0]}</span>
            <span className="tabular-nums">{row[1]}</span>
            <span className="truncate">{row[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The date as the invitation prints it, and the three taps under it. */
function HebrewArt({ art }: { art: BentoCopy['art'] }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="border-accent/50 bg-card text-primary rounded-full border px-4 py-2 font-[family-name:var(--font-display)] text-sm font-bold">
        {art.hebrewDate}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {['Waze', 'Google Maps', art.calendar].map((label) => (
          <span
            key={label}
            className="border-border-strong bg-card text-primary rounded-full border px-3 py-1.5 text-[11px] font-semibold"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureBento({ locale }: { locale: Locale }) {
  const { benefits } = getDictionary(locale).landing;
  const copy = COPY[locale];
  const [invitation, dashboard, hebrew] = benefits.items;

  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24">
      <Container width="wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-accent-strong font-semibold">{benefits.eyebrow}</p>
          <h2 className="text-h1 text-primary mt-3 font-bold">
            <WrittenHeading text={benefits.title} trigger="scroll" />
          </h2>
        </div>

        <div className="mt-11 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6">
          <Tile
            icon="send"
            title={invitation.title}
            body={invitation.body}
            plan={copy.everyPlan}
            className="sm:col-span-2 lg:col-span-4"
            artClassName="h-52 sm:h-56"
          >
            <InvitationArt art={copy.art} />
          </Tile>
          <Tile
            icon="dashboard"
            title={dashboard.title}
            body={dashboard.body}
            plan={copy.everyPlan}
            className="lg:col-span-2"
            artClassName="h-52 sm:h-56"
          >
            <DashboardArt art={copy.art} />
          </Tile>

          <Tile icon="users" {...copy.personal} className="lg:col-span-2">
            <PersonalLinksArt art={copy.art} />
          </Tile>
          <Tile icon="qr" {...copy.qr} className="lg:col-span-2">
            <QrArt locale={locale} caption={copy.art.scan} />
          </Tile>
          <Tile icon="table" {...copy.seating} className="lg:col-span-2">
            <SeatingArt label={copy.art.table} />
          </Tile>

          <Tile icon="file-spreadsheet" {...copy.lists} className="lg:col-span-3">
            <ListsArt art={copy.art} />
          </Tile>
          <Tile
            icon="globe"
            title={hebrew.title}
            body={hebrew.body}
            plan={copy.everyPlan}
            className="lg:col-span-3"
          >
            <HebrewArt art={copy.art} />
          </Tile>

          {/* The one dark tile, closing the grid: what the product will not do with the list. */}
          <article className="reveal bg-surface-ink text-primary-foreground relative overflow-clip rounded-3xl border border-white/10 p-7 sm:col-span-2 sm:p-9 lg:col-span-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(218,174,113,0.18),transparent_55%)]"
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
              <div className="flex shrink-0 items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#edca95]"
                >
                  <Icon name="shield" className="size-6" />
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">
                  {copy.privacy.title}
                </h3>
              </div>
              <ul className="grid flex-1 gap-3 text-sm text-white/85 sm:grid-cols-3 sm:gap-5">
                {copy.privacy.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 leading-relaxed">
                    <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-[#edca95]" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}
