import { useState, useEffect, useCallback } from 'react';

/**
 * Returns [debounced, flush]. `debounced` follows `value` after `delay` ms without changes, so a
 * search box can update on every keystroke while the API only sees the settled text.
 * `flush(next)` applies a value immediately (form submit, reset button).
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const flush = useCallback((next) => setDebounced(next), []);

  return [debounced, flush];
}

export default useDebouncedValue;
