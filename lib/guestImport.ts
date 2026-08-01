import 'server-only';

import { inflateRawSync } from 'node:zlib';

export type ImportedFamilySide = 'side_a' | 'side_b' | 'other' | null;

export interface ImportedGuest {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly familySide: ImportedFamilySide;
  readonly partySize: number;
  readonly tableName: string | null;
  readonly seatNumber: string | null;
  readonly notes: string | null;
}

export type GuestImportSource = 'csv' | 'xlsx';

export interface GuestImportResult {
  readonly source: GuestImportSource;
  readonly rows: readonly ImportedGuest[];
}

export class GuestImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestImportError';
  }
}

const HEADER_ALIASES = {
  fullName: ['שם', 'שם מלא', 'שם המוזמן', 'name', 'full name', 'guest name'],
  phone: ['טלפון', 'נייד', 'מספר טלפון', 'phone', 'mobile', 'telephone'],
  email: ['אימייל', 'דואל', 'מייל', 'email', 'e-mail'],
  familySide: ['צד', 'צד משפחה', 'family side', 'side'],
  partySize: ['כמות', 'מספר מוזמנים', 'גודל קבוצה', 'party size', 'guests', 'count'],
  tableName: ['שולחן', 'שם שולחן', 'table', 'table name'],
  seatNumber: ['מושב', 'כיסא', 'מספר כיסא', 'seat', 'seat number'],
  notes: ['הערות', 'הערה', 'notes', 'note'],
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('he-IL')
    .replace(/[\s_\-."'׳״]+/g, ' ')
    .trim();
}

function textOrNull(value: string | undefined): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}

function parsePartySize(value: string | undefined): number {
  const parsed = Number.parseInt(value?.trim() ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : 1;
}

function parseFamilySide(value: string | undefined): ImportedFamilySide {
  const normalized = normalizeHeader(value ?? '');
  if (['צד א', 'צד א׳', 'א', 'a', 'side a', 'חתן'].includes(normalized)) return 'side_a';
  if (['צד ב', 'צד ב׳', 'ב', 'b', 'side b', 'כלה'].includes(normalized)) return 'side_b';
  if (normalized === '') return null;
  return 'other';
}

function headerIndex(headers: readonly string[], key: HeaderKey): number {
  const aliases = HEADER_ALIASES[key].map(normalizeHeader);
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

export function rowsToImportedGuests(
  rows: readonly (readonly string[])[],
): readonly ImportedGuest[] {
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) throw new GuestImportError('הקובץ ריק.');

  const headers = nonEmpty[0] ?? [];
  const indexes: Record<HeaderKey, number> = {
    fullName: headerIndex(headers, 'fullName'),
    phone: headerIndex(headers, 'phone'),
    email: headerIndex(headers, 'email'),
    familySide: headerIndex(headers, 'familySide'),
    partySize: headerIndex(headers, 'partySize'),
    tableName: headerIndex(headers, 'tableName'),
    seatNumber: headerIndex(headers, 'seatNumber'),
    notes: headerIndex(headers, 'notes'),
  };

  if (indexes.fullName < 0 || indexes.phone < 0) {
    throw new GuestImportError('חסרות עמודות חובה: שם וטלפון.');
  }

  const guests: ImportedGuest[] = [];
  for (const row of nonEmpty.slice(1)) {
    const fullName = row[indexes.fullName]?.trim() ?? '';
    const phone = row[indexes.phone]?.trim() ?? '';
    if (fullName === '' && phone === '') continue;
    if (fullName === '' || phone === '') {
      throw new GuestImportError('בכל שורה חייבים להופיע שם וטלפון.');
    }

    const cell = (key: HeaderKey): string | undefined => {
      const index = indexes[key];
      return index < 0 ? undefined : row[index];
    };

    guests.push({
      fullName,
      phone,
      email: textOrNull(cell('email')),
      familySide: parseFamilySide(cell('familySide')),
      partySize: parsePartySize(cell('partySize')),
      tableName: textOrNull(cell('tableName')),
      seatNumber: textOrNull(cell('seatNumber')),
      notes: textOrNull(cell('notes')),
    });
  }

  if (guests.length === 0) throw new GuestImportError('לא נמצאו מוזמנים בקובץ.');
  if (guests.length > 1_000) throw new GuestImportError('ניתן לייבא עד 1,000 מוזמנים בכל קובץ.');
  return guests;
}

export function parseDelimitedText(text: string): readonly (readonly string[])[] {
  const sample = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiters = [',', '\t', ';'] as const;
  const delimiter = delimiters.reduce((best, candidate) => {
    const score = sample.split(candidate).length;
    return score > sample.split(best).length ? candidate : best;
  }, delimiters[0]);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      pushCell();
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      pushRow();
    } else {
      cell += character;
    }
  }

  if (cell !== '' || row.length > 0) pushRow();
  return rows;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new GuestImportError('קובץ ה-Excel אינו תקין.');
}

function unzipEntries(buffer: Buffer): Map<string, Buffer> {
  const end = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new GuestImportError('ספריית קובץ ה-Excel פגומה.');
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new GuestImportError('רשומת קובץ ה-Excel פגומה.');
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) entries.set(fileName, Buffer.from(compressed));
    else if (method === 8) entries.set(fileName, inflateRawSync(compressed));
    else throw new GuestImportError('קובץ ה-Excel משתמש בדחיסה שאינה נתמכת.');

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A';
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

function parseSharedStrings(xml: string | undefined): readonly string[] {
  if (xml === undefined) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const fragments = [...(match[1] ?? '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
    return decodeXmlText(fragments.map((fragment) => fragment[1] ?? '').join(''));
  });
}

function parseSheetRows(
  xml: string,
  sharedStrings: readonly string[],
): readonly (readonly string[])[] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? '').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1] ?? '';
      const body = cellMatch[2] ?? '';
      const reference = attributes.match(/\br="([A-Z]+\d+)"/i)?.[1] ?? 'A1';
      const type = attributes.match(/\bt="([^"]+)"/)?.[1] ?? '';
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const inline = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
      const value =
        type === 's'
          ? (sharedStrings[Number.parseInt(raw, 10)] ?? '')
          : type === 'inlineStr'
            ? decodeXmlText(inline)
            : decodeXmlText(raw);
      row[columnIndex(reference)] = value;
    }
    rows.push(row.map((cell) => cell ?? ''));
  }
  return rows;
}

export function parseXlsxRows(input: Uint8Array): readonly (readonly string[])[] {
  const entries = unzipEntries(Buffer.from(input));
  const sheetPath = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort()[0];
  if (sheetPath === undefined) throw new GuestImportError('לא נמצא גיליון בקובץ ה-Excel.');

  const sheet = entries.get(sheetPath);
  if (sheet === undefined) throw new GuestImportError('לא ניתן לקרוא את הגיליון.');
  const shared = entries.get('xl/sharedStrings.xml');
  return parseSheetRows(sheet.toString('utf8'), parseSharedStrings(shared?.toString('utf8')));
}

export function importGuestsFromFile(input: Uint8Array, fileName: string): GuestImportResult {
  const lower = fileName.toLocaleLowerCase('en-US');
  if (lower.endsWith('.xlsx')) {
    return { source: 'xlsx', rows: rowsToImportedGuests(parseXlsxRows(input)) };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    const text = new TextDecoder('utf-8').decode(input).replace(/^\uFEFF/, '');
    return { source: 'csv', rows: rowsToImportedGuests(parseDelimitedText(text)) };
  }
  throw new GuestImportError('יש להעלות קובץ Excel מסוג XLSX או קובץ CSV/TSV.');
}
