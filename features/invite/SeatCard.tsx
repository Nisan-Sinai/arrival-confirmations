import { Card } from '@/components/ui/card';

/**
 * Where the guest is sitting.
 *
 * The single most asked question at an Israeli simcha, and until now this product knew
 * the answer and never said it. The seating studio writes `table_name` and `seat_number`
 * onto the guest row; the guest's own page never read them back. The market survey is what
 * made that visible — sending a guest their table on the day is something the Israeli
 * services treat as a chargeable extra, and here the data was already sitting there.
 *
 * Deliberately quiet in three ways:
 *
 *   * **It does not appear until there is something to say.** An empty "table: —" is worse
 *     than no card, because it invites a guest to wonder whether they were forgotten. Hosts
 *     seat people late, often the night before, so most of the time this renders nothing.
 *   * **The table is the headline; the seat is a footnote.** At a round table of ten nobody
 *     hunts for chair four, and most hosts only ever name the table.
 *   * **No instruction.** "Find your table" would be telling a grown adult how a wedding
 *     works.
 */
export function SeatCard({
  tableName,
  seatNumber,
  partySize,
}: {
  readonly tableName: string | null;
  readonly seatNumber: string | null;
  /** Shown only above one, where "your seats" needs to read as plural. */
  readonly partySize: number;
}) {
  const table = tableName?.trim() ?? '';
  if (table === '') return null;

  const seat = seatNumber?.trim() ?? '';

  return (
    <Card padding="lg" className="border-accent/30 text-center">
      <p className="text-eyebrow text-accent-strong font-semibold">
        {partySize > 1 ? 'המקומות שלכם' : 'המקום שלך'}
      </p>
      <p
        className="text-primary mt-3 font-[family-name:var(--font-display)] text-4xl font-bold"
        // The table's name is the answer, so it is the thing that is large. A name rather
        // than a number as often as not — hosts write "שולחן המשפחה" as readily as "7".
        dir="auto"
      >
        {table}
      </p>
      {seat !== '' && <p className="text-muted-foreground mt-2 text-sm">מושב {seat}</p>}
    </Card>
  );
}
