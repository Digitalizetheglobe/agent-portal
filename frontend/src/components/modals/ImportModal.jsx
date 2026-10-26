import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { importAPI, formatApiError } from '../../utils/api';
import { COLUMNS, readImportFile, downloadTemplate } from '../../utils/importFile';

const BATCH_SIZE = 200;
const SHOWN_ERRORS = 100;

const COPY = {
  universities: {
    title: 'Import universities',
    noun: 'universities',
    help: 'One row per university. A university that already exists (same code, or same name) is updated; blank cells never erase saved details.',
  },
  programs: {
    title: 'Import programs',
    noun: 'programs',
    help: 'One row per program and university. Put the university code or name in the University column, with that university\'s own price. A program several universities offer is one row for each. Import the universities first.',
  },
};

/**
 * Adds many universities or programs from an Excel or CSV file. The file is checked first and nothing is
 * saved until the user confirms; rows with a problem are listed by row number and skipped.
 */
const ImportModal = ({ open, onOpenChange, kind, onImported }) => {
  const copy = COPY[kind];
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [readError, setReadError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | checking | checked | importing | done
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setParsed(null);
    setReadError('');
    setPhase('idle');
    setProgress(0);
    setSummary(null);
  }, [open, kind]);

  if (!copy) return null;
  const busy = phase === 'checking' || phase === 'importing';

  const choose = async (e) => {
    const chosen = e.target.files[0];
    e.target.value = '';
    if (!chosen) return;
    setFile(chosen);
    setParsed(null);
    setSummary(null);
    setReadError('');
    setPhase('idle');
    try {
      const result = await readImportFile(chosen, kind);
      if (result.error) setReadError(result.error);
      else setParsed(result);
    } catch (error) {
      setReadError(error.message || 'The file could not be read.');
    }
  };

  // Sends the rows in batches so a very large file never hits a request size limit
  const run = async (dryRun) => {
    setPhase(dryRun ? 'checking' : 'importing');
    setProgress(0);
    const total = { created: 0, updated: 0, openToAll: 0, errors: [] };
    try {
      for (let i = 0; i < parsed.rows.length; i += BATCH_SIZE) {
        const batch = parsed.rows.slice(i, i + BATCH_SIZE);
        const { data } = await importAPI[kind](batch, dryRun);
        total.created += data.created;
        total.updated += data.updated;
        total.openToAll += data.openToAll || 0;
        total.errors.push(...data.errors);
        setProgress(Math.min(100, Math.round(((i + batch.length) / parsed.rows.length) * 100)));
      }
      total.errors.sort((a, b) => a.row - b.row);
      setSummary(total);
      setPhase(dryRun ? 'checked' : 'done');
      if (!dryRun) {
        toast.success(`${copy.title.replace('Import ', '')} imported`, {
          description: `${total.created} added, ${total.updated} updated${total.errors.length ? `, ${total.errors.length} skipped` : ''}.`,
        });
        if (onImported) onImported();
      }
    } catch (error) {
      toast.error(dryRun ? 'The file could not be checked' : 'The import stopped', { description: formatApiError(error) });
      setPhase(dryRun ? 'idle' : 'checked');
    }
  };

  const importable = summary ? summary.created + summary.updated : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">{copy.title}</DialogTitle>
          <DialogDescription>{copy.help}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate(kind)} className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download template
            </Button>
            <span className="text-[11px] text-[#6B7280]">
              Columns: {COLUMNS[kind].map((c) => c.label + (c.required ? '*' : '')).join(', ')}
            </span>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-[#D1D5DB] hover:border-[#042C53] bg-[#F9FAFB] px-4 py-6 text-center transition-colors"
          >
            <input ref={inputRef} type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={choose} />
            {file ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <FileSpreadsheet className="w-4 h-4 text-[#27500A]" /> {file.name}
                {parsed && <span className="font-normal text-[#6B7280]">· {parsed.rows.length} rows</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
                <Upload className="w-4 h-4" /> Choose an Excel (.xlsx) or CSV file
              </span>
            )}
          </button>

          {readError && (
            <p className="flex items-start gap-2 text-xs text-[#791F1F] bg-[#FCEBEB] rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {readError}
            </p>
          )}

          {parsed?.ignoredColumns?.length > 0 && (
            <p className="text-[11px] text-[#633806] bg-[#FAEEDA] rounded-lg p-3">
              These columns are not used and will be ignored: {parsed.ignoredColumns.join(', ')}.
            </p>
          )}

          {busy && (
            <div>
              <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                <div className="h-full bg-[#042C53] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">{phase === 'checking' ? 'Checking' : 'Importing'}... {progress}%</p>
            </div>
          )}

          {summary && (
            <div className={`rounded-xl border p-4 space-y-3 ${phase === 'done' ? 'border-[#C9E3B0] bg-[#EAF3DE]/50' : 'border-[#E5E7EB] bg-white'}`}>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                {phase === 'done' && <CheckCircle2 className="w-4 h-4 text-[#27500A]" />}
                {phase === 'done' ? 'Import finished' : 'This is what will happen'}
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white border border-[#E5E7EB] py-2"><p className="text-xl font-bold text-[#27500A]">{summary.created}</p><p className="text-[10px] uppercase tracking-wider text-[#6B7280]">{phase === 'done' ? 'Added' : 'New'}</p></div>
                <div className="rounded-lg bg-white border border-[#E5E7EB] py-2"><p className="text-xl font-bold text-[#0C447C]">{summary.updated}</p><p className="text-[10px] uppercase tracking-wider text-[#6B7280]">{phase === 'done' ? 'Updated' : 'Updates'}</p></div>
                <div className="rounded-lg bg-white border border-[#E5E7EB] py-2"><p className={`text-xl font-bold ${summary.errors.length ? 'text-[#791F1F]' : 'text-[#6B7280]'}`}>{summary.errors.length}</p><p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Skipped</p></div>
              </div>
              {summary.errors.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#791F1F] uppercase tracking-wider mb-1">Rows that will be skipped</p>
                  <ul className="max-h-40 overflow-y-auto rounded-lg border border-[#F2C9C9] bg-white divide-y divide-[#F3F4F6]">
                    {summary.errors.slice(0, SHOWN_ERRORS).map((err, i) => (
                      <li key={`${err.row}-${i}`} className="px-3 py-1.5 text-xs text-[#4B5563]">
                        <span className="font-semibold text-[#111827]">Row {err.row}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                  {summary.errors.length > SHOWN_ERRORS && (
                    <p className="text-[11px] text-[#6B7280] mt-1">...and {summary.errors.length - SHOWN_ERRORS} more. Fix these in the file and import it again; rows already imported are only updated, never duplicated.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{phase === 'done' ? 'Close' : 'Cancel'}</Button>
          {phase !== 'done' && phase !== 'checked' && (
            <Button onClick={() => run(true)} disabled={!parsed || busy} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
              {phase === 'checking' ? 'Checking...' : 'Check file'}
            </Button>
          )}
          {phase === 'checked' && (
            <Button onClick={() => run(false)} disabled={importable === 0 || busy} className="bg-[#27500A] hover:bg-[#1E3D07] text-white">
              Import {importable} {copy.noun}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;
