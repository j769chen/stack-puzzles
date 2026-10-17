import { StatusBar } from 'expo-status-bar';
import { useEffect, useEffectEvent, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { feedback } from './src/feedback';
import { HomeScreen } from './src/HomeScreen';
import { HanoiScreen } from './src/games/hanoi/HanoiScreen';
import { DailyScreen } from './src/games/hoops/DailyScreen';
import { HoopScreen } from './src/games/hoops/HoopScreen';
import { TowerSortScreen } from './src/games/towersort/TowerSortScreen';
import { loadSettings } from './src/settings';
import { loadStars } from './src/stars';

type Screen = 'home' | 'hanoi' | 'hoops' | 'daily' | 'towersort';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    loadSettings();
    loadStars();
    feedback.prepare();
  }, []);

  const onHardwareBack = useEffectEvent(() => {
    if (screen === 'home') return false;
    setScreen('home');
    return true;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  const goHome = () => setScreen('home');

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {screen === 'home' ? (
        <HomeScreen onOpen={setScreen} />
      ) : (
        <ErrorBoundary onBack={goHome}>
          {screen === 'hanoi' && <HanoiScreen onBack={goHome} />}
          {screen === 'hoops' && <HoopScreen onBack={goHome} />}
          {screen === 'daily' && <DailyScreen onBack={goHome} />}
          {screen === 'towersort' && <TowerSortScreen onBack={goHome} />}
        </ErrorBoundary>
      )}
    </SafeAreaProvider>
  );
}
