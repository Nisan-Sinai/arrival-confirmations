import { deflateRawSync } from 'node:zlib';

import { describe, expect, it, vi } from 'vitest';

import {
  GuestImportError,
  importGuestsFromFile,
  parseDelimitedText,
  parseXlsxRows,
  rowsToImportedGuests,
} from '@/lib/guestImport';

interface ZipEntry {
  readonly name: string;
  readonly content: string;
  readonly method?: number;
}

function makeZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const raw = Buffer.from(entry.content);
    const method = entry.method ?? 0;
    const compressed = method === 8 ? deflateRawSync(raw) : raw;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(method, 10);
    directory.writeUInt32LE(compressed.length, 20);
    directory.writeUInt32LE(raw.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(localOffset, 42);
    central.push(directory, name);

    localOffset += local.length + name.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

const sharedStrings = `<?xml version="1.0"?><sst>
  <si><t>שם</t></si><si><t>טלפון</t></si><si><t>אימייל</t></si><si><t>צד</t></si>
  <si><t>כמות</t></si><si><t>שולחן</t></si><si><t>מושב</t></si>
  <si><r><t>הע</t></r><r><t>רות</t></r></si>
</sst>`;

const sharedSheet = `<?xml version="1.0"?><worksheet><sheetData>
  <row r="1">
    <c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>
    <c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c>
    <c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c>
    <c r="G1" t="s"><v>6</v></c><c r="H1" t="s"><v>7</v></c>
  </row>
  <row r="2">
    <c r="A2" t="inlineStr"><is><t>ישראל &amp; שרה</t></is></c>
    <c r="B2" t="inlineStr"><is><t>050-1234567</t></is></c>
    <c r="C2" t="inlineStr"><is><t>family@example.com</t></is></c>
    <c r="D2" t="inlineStr"><is><t>חתן</t></is></c>
    <c r="E2"><v>3</v></c>
    <c r="F2" t="inlineStr"><is><t>12</t></is></c>
    <c r="G2" t="inlineStr"><is><t>4</t></is></c>
    <c r="H2" t="inlineStr"><is><t>&lt;VIP&gt; &#33; &#x2B;</t></is></c>
  </row>
</sheetData></worksheet>`;

const inlineSheet = `<?xml version="1.0"?><worksheet><sheetData>
  <row><c t="inlineStr"><is><t>name</t></is></c><c r="B1" t="inlineStr"><is><t>phone</t></is></c></row>
  <row><c r="A2" t="inlineStr"><is><t>Test Guest</t></is></c><c r="B2" t="inlineStr"><is><t>0521234567</t></is></c></row>
</sheetData></worksheet>`;

describe('guest spreadsheet import', () => {
  it('parses quoted CSV, escaped quotes and CRLF', () => {
    expect(parseDelimitedText('שם,טלפון,הערות\r\n"דנה, כהן",0501234567,"אמרה ""כן"""')).toEqual([
      ['שם', 'טלפון', 'הערות'],
      ['דנה, כהן', '0501234567', 'אמרה "כן"'],
    ]);
  });

  it('detects TSV and semicolon-delimited exports', () => {
    expect(parseDelimitedText('name\tphone\nA\t0501234567')).toEqual([
      ['name', 'phone'],
      ['A', '0501234567'],
    ]);
    expect(parseDelimitedText('name;phone\nB;0521234567')).toEqual([
      ['name', 'phone'],
      ['B', '0521234567'],
    ]);
  });

  it('maps Hebrew and English columns, sides, defaults and optional values', () => {
    expect(
      rowsToImportedGuests([
        ['שם מלא', 'מספר טלפון', 'מייל', 'צד משפחה', 'מספר מוזמנים', 'שם שולחן', 'כיסא', 'הערה'],
        ['דנה', '0501234567', 'dana@example.com', 'צד א׳', '2', '10', '1', 'טבעונית'],
        ['יונתן', '0521234567', '', 'כלה', '99', '', '', ''],
        ['אורח', '0531234567', '', 'משפחה', 'abc', '', '', ''],
        [' ', ' ', '', '', '', '', '', ''],
      ]),
    ).toEqual([
      {
        fullName: 'דנה',
        phone: '0501234567',
        email: 'dana@example.com',
        familySide: 'side_a',
        partySize: 2,
        tableName: '10',
        seatNumber: '1',
        notes: 'טבעונית',
      },
      {
        fullName: 'יונתן',
        phone: '0521234567',
        email: null,
        familySide: 'side_b',
        partySize: 1,
        tableName: null,
        seatNumber: null,
        notes: null,
      },
      {
        fullName: 'אורח',
        phone: '0531234567',
        email: null,
        familySide: 'other',
        partySize: 1,
        tableName: null,
        seatNumber: null,
        notes: null,
      },
    ]);
  });

  it('reports empty files, missing headers, incomplete rows and files without guests', () => {
    expect(() => rowsToImportedGuests([])).toThrow('הקובץ ריק');
    expect(() => rowsToImportedGuests([['email']])).toThrow('שם וטלפון');
    expect(() => rowsToImportedGuests([['name', 'phone'], ['Only name', '']])).toThrow(
      'בכל שורה',
    );
    expect(() => rowsToImportedGuests([['name', 'phone'], ['', '']])).toThrow('לא נמצאו');
  });

  it('enforces the 1,000-row import limit', () => {
    const rows = [
      ['name', 'phone'],
      ...Array.from({ length: 1_001 }, (_, index) => [`Guest ${index}`, `050${index}`]),
    ];
    expect(() => rowsToImportedGuests(rows)).toThrow('1,000');
  });

  it('reads a stored XLSX with shared and inline strings', () => {
    const workbook = makeZip([
      { name: 'xl/sharedStrings.xml', content: sharedStrings },
      { name: 'xl/worksheets/sheet1.xml', content: sharedSheet },
    ]);
    expect(parseXlsxRows(workbook)).toEqual([
      ['שם', 'טלפון', 'אימייל', 'צד', 'כמות', 'שולחן', 'מושב', 'הערות'],
      ['ישראל & שרה', '050-1234567', 'family@example.com', 'חתן', '3', '12', '4', '<VIP> ! +'],
    ]);
    expect(importGuestsFromFile(workbook, 'Guests.XLSX')).toEqual({
      source: 'xlsx',
      rows: [
        {
          fullName: 'ישראל & שרה',
          phone: '050-1234567',
          email: 'family@example.com',
          familySide: 'side_a',
          partySize: 3,
          tableName: '12',
          seatNumber: '4',
          notes: '<VIP> ! +',
        },
      ],
    });
  });

  it('reads a deflated XLSX without shared strings and defaults a missing cell reference', () => {
    const workbook = makeZip([
      { name: 'xl/worksheets/sheet2.xml', content: inlineSheet, method: 8 },
    ]);
    expect(parseXlsxRows(workbook)).toEqual([
      ['name', 'phone'],
      ['Test Guest', '0521234567'],
    ]);
  });

  it('imports UTF-8 BOM CSV and supports TSV and TXT extensions', () => {
    const csv = new TextEncoder().encode('\uFEFFname,phone\nGuest,0541234567');
    expect(importGuestsFromFile(csv, 'guests.csv').source).toBe('csv');
    expect(importGuestsFromFile(csv, 'guests.tsv').rows[0]?.fullName).toBe('Guest');
    expect(importGuestsFromFile(csv, 'guests.txt').rows[0]?.phone).toBe('0541234567');
  });

  it('rejects unsupported extensions and malformed ZIP structures', () => {
    expect(() => importGuestsFromFile(new Uint8Array(), 'guests.xls')).toThrow(GuestImportError);
    expect(() => parseXlsxRows(new Uint8Array())).toThrow('אינו תקין');

    const centralCorrupt = makeZip([{ name: 'xl/worksheets/sheet1.xml', content: inlineSheet }]);
    const centralOffset = centralCorrupt.readUInt32LE(centralCorrupt.length - 6);
    centralCorrupt.writeUInt32LE(0, centralOffset);
    expect(() => parseXlsxRows(centralCorrupt)).toThrow('ספריית');

    const localCorrupt = makeZip([{ name: 'xl/worksheets/sheet1.xml', content: inlineSheet }]);
    localCorrupt.writeUInt32LE(0, 0);
    expect(() => parseXlsxRows(localCorrupt)).toThrow('רשומת');

    const unsupported = makeZip([
      { name: 'xl/worksheets/sheet1.xml', content: inlineSheet, method: 9 },
    ]);
    expect(() => parseXlsxRows(unsupported)).toThrow('דחיסה');

    const noSheet = makeZip([{ name: 'xl/sharedStrings.xml', content: sharedStrings }]);
    expect(() => parseXlsxRows(noSheet)).toThrow('לא נמצא גיליון');
  });

  it('handles the defensive missing-sheet read branch', () => {
    const workbook = makeZip([{ name: 'xl/worksheets/sheet1.xml', content: inlineSheet }]);
    const original = Map.prototype.get;
    const spy = vi.spyOn(Map.prototype, 'get').mockImplementation(function (key) {
      if (key === 'xl/worksheets/sheet1.xml') return undefined;
      return original.call(this, key);
    });
    expect(() => parseXlsxRows(workbook)).toThrow('לא ניתן לקרוא');
    spy.mockRestore();
  });
});
