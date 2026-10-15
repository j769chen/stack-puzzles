import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/HomeScreen';
import { HanoiScreen } from './src/games/hanoi/HanoiScreen';
import { HoopScreen } from './src/games/hoops/HoopScreen';
import { loadSettings } from './src/settings';
import { loadStars } from './src/stars';

type Screen = 'home' | 'hanoi' | 'hoops';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    loadSettings();
    loadStars();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      setScreen('home');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const goHome = () => setScreen('home');

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {screen === 'home' && <HomeScreen onOpen={setScreen} />}
      {screen === 'hanoi' && <HanoiScreen onBack={goHome} />}
      {screen === 'hoops' && <HoopScreen onBack={goHome} />}
    </SafeAreaProvider>
  );
}
