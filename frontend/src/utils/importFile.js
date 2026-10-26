// Reads a spreadsheet (Excel .xlsx or CSV) of universities or programs into rows the import API understands.
// Column titles are matched loosely ("University Name", "university name" and "Name" all work),
// so a list exported from another system usually needs no editing.

export const COLUMNS = {
  universities: [
    { key: 'name', label: 'Name', required: true, aliases: ['name', 'university', 'university name', 'institution', 'institution name'], example: "Taylor's University" },
    { key: 'code', label: 'Code', aliases: ['code', 'university code', 'short name', 'abbreviation'], example: 'TU' },
    { key: 'country', label: 'Country', required: true, aliases: ['country'], example: 'Malaysia' },
    { key: 'city', label: 'City', aliases: ['city', 'location'], example: 'Subang Jaya' },
    { key: 'website', label: 'Website', aliases: ['website', 'web site', 'url', 'website url', 'link'], example: 'https://university.taylors.edu.my' },
    { key: 'logoUrl', label: 'Logo URL', aliases: ['logo', 'logo url', 'logourl', 'logo link'], example: '' },
    { key: 'commissionRate', label: 'Commission %', aliases: ['commission', 'commission rate', 'commission %', 'commissionrate', 'rate'], example: '15' },
    { key: 'status', label: 'Status', aliases: ['status'], example: 'active' },
    { key: 'contactPerson', label: 'Contact person', aliases: ['contact person', 'contact name', 'contact'], example: '' },
    { key: 'contactEmail', label: 'Contact email', aliases: ['contact email', 'email', 'contact e mail'], example: '' },
    { key: 'description', label: 'Description', aliases: ['description', 'about', 'notes'], example: '' },
  ],
  programs: [
    { key: 'name', label: 'Name', required: true, aliases: ['name', 'program', 'programme', 'program name', 'programme name', 'course', 'course name', 'title'], example: 'Bachelor of Computer Science' },
    { key: 'code', label: 'Code', aliases: ['code', 'program code', 'programme code', 'course code'], example: 'BCS' },
    { key: 'level', label: 'Level', aliases: ['level', 'degree level', 'degree', 'study level', 'type'], example: 'Undergraduate' },
    { key: 'university', label: 'University (code or name)', required: true, aliases: ['university', 'university code', 'university name', 'universities', 'institution'], example: 'TU' },
    { key: 'department', label: 'Faculty / Department', aliases: ['department', 'faculty', 'school', 'faculty department'], example: 'School of Computing' },
    { key: 'duration', label: 'Duration', aliases: ['duration', 'length'], example: '3 years' },
    { key: 'tuitionFee', label: 'Tuition fee', aliases: ['tuition', 'tuition fee', 'tuitionfee', 'fee', 'fees', 'total fee'], example: '15000' },
    { key: 'entryRequirements', label: 'Entry requirements', aliases: ['entry requirements', 'entry requirement', 'requirements', 'admission requirements'], example: 'SPM 5 credits; IELTS 6.0' },
    { key: 'awardingBody', label: 'Awarding body', aliases: ['awarding body', 'awarded by', 'awarding university'], example: '' },
    { key: 'status', label: 'Status', aliases: ['status'], example: 'active' },
    { key: 'description', label: 'Description', aliases: ['description', 'about', 'notes'], example: '' },
  ],
};

const SHEET_NAMES = {
  universities: ['universities', 'university', 'institutions', 'institution'],
  programs: ['programs', 'program', 'programmes', 'programme', 'courses', 'course'],
};

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

// One cell as plain text
const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

// CSV with quotes, commas or semicolons or tabs as separators, and a possible Excel BOM
const parseCsv = (input) => {
  const textValue = input.replace(/^﻿/, '');
  const firstLine = textValue.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

  const rows = [];
  let row = [];
  let field = '';
  quoted = false;
  for (let i = 0; i < textValue.length; i += 1) {
    const ch = textValue[i];
    if (quoted) {
      if (ch === '"' && textValue[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && textValue[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
};

// Raw rows of the file: [[cell, cell, ...], ...]
const readRawRows = async (file, kind) => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') {
    return parseCsv(await file.text());
  }
  if (name.endsWith('.xlsx')) {
    const { default: readExcelFile } = await import('read-excel-file/browser');
    const sheets = await readExcelFile(file);
    const wanted = SHEET_NAMES[kind];
    const match = sheets.find((s) => wanted.includes(norm(s.sheet)));
    return (match || sheets[0]).data;
  }
  throw new Error('Choose an Excel (.xlsx) or CSV file. An older .xls file can be saved as .xlsx or CSV from Excel.');
};

/**
 * Reads the file and returns { rows, ignoredColumns, error }.
 * Each row has the column keys plus `_row`, its row number in the spreadsheet (the header is row 1).
 */
export const readImportFile = async (file, kind) => {
  const raw = await readRawRows(file, kind);
  const headerIndex = raw.findIndex((r) => r.some((c) => cellText(c)));
  if (headerIndex < 0) return { rows: [], ignoredColumns: [], error: 'The file is empty.' };

  const columns = COLUMNS[kind];
  const header = raw[headerIndex].map((h) => norm(h));
  const keyAt = header.map((h) => columns.find((c) => c.aliases.map(norm).includes(h))?.key || null);
  const ignoredColumns = raw[headerIndex].filter((h, i) => cellText(h) && !keyAt[i]).map(cellText);

  const missing = columns.filter((c) => c.required && !keyAt.includes(c.key));
  if (!keyAt.includes('name')) {
    return { rows: [], ignoredColumns, error: `The first row must have a "${columns[0].label}" column. Download the template to see the expected columns.` };
  }

  const rows = [];
  for (let i = headerIndex + 1; i < raw.length; i += 1) {
    const cells = raw[i];
    if (!cells.some((c) => cellText(c))) continue;
    const row = { _row: i + 1 };
    keyAt.forEach((key, col) => { if (key) row[key] = cellText(cells[col]); });
    rows.push(row);
  }
  return { rows, ignoredColumns, missingColumns: missing.map((c) => c.label), error: rows.length ? null : 'The file has a header row but no data rows.' };
};

// A CSV the user can open in Excel, with the right columns and one example row
export const downloadTemplate = (kind) => {
  const columns = COLUMNS[kind];
  const quote = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const csv = `${columns.map((c) => quote(c.label)).join(',')}\n${columns.map((c) => quote(c.example)).join(',')}\n`;
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${kind}-import-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
