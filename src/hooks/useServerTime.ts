import { useState, useEffect } from 'react';
import { fetchServerTime } from '@/services/api';

// Custom hook for server time offset
export const useServerTime = () => {
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(90000);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    fetchServerTime()
      .then((data) => {
        if (mounted) {
          setServerOffsetMs(data.serverOffsetMs);
          setIsSynced(true);
        }
      })
      .catch(() => {
        // Fallback default 90s offset
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    serverOffsetMs,
    isSynced,
  };
};
