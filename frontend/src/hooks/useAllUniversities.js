import { useEffect, useState } from 'react';
import { universityAPI } from '../utils/api';

// Every university (the API returns at most 100 per page), loaded once while `enabled` is true.
// The app-wide list only holds the first few, so forms that need to pick any university use this.
const useAllUniversities = (enabled = true) => {
  const [universities, setUniversities] = useState(null);

  useEffect(() => {
    if (!enabled || universities) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const { data } = await universityAPI.getAll({ page, limit: 100, envelope: 'true' });
          all.push(...(data.universities || []));
          totalPages = data.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
        if (!cancelled) setUniversities(all);
      } catch {
        if (!cancelled) setUniversities([]);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, universities]);

  return { universities: universities || [], loading: universities === null };
};

export default useAllUniversities;
