import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { searchAPI } from '../../utils/api';
import { cn } from '../../lib/utils';

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * Search box for the top bar: finds universities, courses, students, applications, invoices, payoffs
 * and (for staff) agents in one place. The server limits the results to what the person may open.
 * Ctrl/Cmd+K focuses it; arrow keys move through the results; Enter opens one; Esc closes.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const latestRequest = useRef(0);

  const items = groups.flatMap((group) => group.items);
  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_LENGTH;

  // Search shortly after typing stops. Older answers are ignored so a slow reply never overwrites a newer one.
  useEffect(() => {
    if (!searching) {
      setGroups([]);
      setLoading(false);
      setError(false);
      return undefined;
    }
    const requestId = ++latestRequest.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAPI.search(trimmed);
        if (requestId !== latestRequest.current) return;
        setGroups(res.data.groups || []);
        setActive(0);
        setError(false);
      } catch {
        if (requestId === latestRequest.current) setError(true);
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, searching]);

  // Ctrl/Cmd+K to focus
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside closes
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (item) => {
    setOpen(false);
    setQuery('');
    navigate(item.path);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActive((index) => (index + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((index) => (index - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  };

  let position = -1;

  return (
    <div ref={boxRef} className="relative w-full" data-testid="global-search">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search students, applications, universities... (Ctrl+K)"
        aria-label="Search"
        className="h-9 w-full rounded-lg bg-slate-800 border border-slate-700 pl-9 pr-8 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {open && trimmed.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white shadow-xl z-50" role="listbox">
          {!searching ? (
            <p className="px-4 py-3 text-xs text-[#6B7280]">Type at least {MIN_LENGTH} characters.</p>
          ) : error ? (
            <p className="px-4 py-3 text-xs text-red-700">Search is not available right now. Please try again.</p>
          ) : loading && groups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#6B7280]">Searching...</p>
          ) : groups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#6B7280]">No results for "{trimmed}".</p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="py-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{group.label}</p>
                {group.items.map((item) => {
                  position += 1;
                  const index = position;
                  return (
                    <button
                      key={`${group.type}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(item)}
                      className={cn(
                        'w-full text-left px-4 py-2 flex flex-col',
                        index === active ? 'bg-[#E6F1FB]' : 'hover:bg-[#F9FAFB]'
                      )}
                    >
                      <span className="text-sm font-medium text-[#111827] truncate">{item.title}</span>
                      {item.subtitle && <span className="text-[11px] text-[#6B7280] truncate">{item.subtitle}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
