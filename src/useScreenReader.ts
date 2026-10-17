import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    let changed = false;
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => {
      changed = true;
      setEnabled(on);
    });
    AccessibilityInfo.isScreenReaderEnabled().then(
      (on) => active && !changed && setEnabled(on),
      () => {},
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
