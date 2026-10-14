import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => active && setEnabled(on));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
