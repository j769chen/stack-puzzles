import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dailyKey } from './daily';

export function useToday(): number {
  const [today, setToday] = useState(() => dailyKey(new Date()));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(dailyKey(new Date()));
    });
    return () => subscription.remove();
  }, []);

  return today;
}
