import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { feedback } from './feedback';
import { updateSettings } from './settings';

jest.mock('../assets/sounds/pick.wav', () => 'pick');
jest.mock('../assets/sounds/drop1.wav', () => 'drop1');
jest.mock('../assets/sounds/drop2.wav', () => 'drop2');
jest.mock('../assets/sounds/drop3.wav', () => 'drop3');
jest.mock('../assets/sounds/complete.wav', () => 'complete');
jest.mock('../assets/sounds/win.wav', () => 'win');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Soft: 'soft', Rigid: 'rigid', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

type MockPlayer = { seekTo: jest.Mock; play: jest.Mock };

function playerFor(sound: string) {
  const created = jest.mocked(createAudioPlayer).mock;
  const index = created.calls.findIndex(([source]) => source === sound);
  return {
    player: created.results[index]?.value as MockPlayer | undefined,
    creations: created.calls.filter(([source]) => source === sound).length,
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  updateSettings({ sound: true, haptics: true });
});

describe('feedback', () => {
  it('gives a soft tap and plays a click when a piece is picked up', () => {
    feedback.pick();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('soft');
    expect(playerFor('pick').player!.play).toHaveBeenCalled();
  });

  it('uses a rigid tap for a drop and success for a win', () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    feedback.drop();
    feedback.win();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('rigid');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('taps twice for a completed rod, in time with its two notes', () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    feedback.complete();
    expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([['rigid']]);
    jest.advanceTimersByTime(90);
    expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([['rigid'], ['medium']]);
  });

  it('rotates through the drop sounds so repeated moves vary', () => {
    const plays = () => ['drop1', 'drop2', 'drop3'].map((sound) => playerFor(sound).player?.play.mock.calls.length ?? 0);
    feedback.drop();
    feedback.drop();
    feedback.drop();
    const before = plays();
    feedback.drop();
    feedback.drop();
    feedback.drop();
    expect(plays()).toEqual(before.map((count) => count + 1));
    expect(['drop1', 'drop2', 'drop3'].map((sound) => playerFor(sound).creations)).toEqual([1, 1, 1]);
  });

  it('creates each sound once and rewinds it before replaying', () => {
    feedback.pick();
    const { player } = playerFor('pick');
    const plays = player!.play.mock.calls.length;
    feedback.pick();
    feedback.pick();
    expect(playerFor('pick').creations).toBe(1);
    expect(player!.seekTo).toHaveBeenLastCalledWith(0);
    expect(player!.play).toHaveBeenCalledTimes(plays + 2);
  });

  it('stays silent when sound is off but still buzzes', () => {
    feedback.pick();
    const { player } = playerFor('pick');
    const plays = player!.play.mock.calls.length;
    jest.mocked(Haptics.impactAsync).mockClear();

    updateSettings({ sound: false });
    feedback.pick();
    expect(player!.play).toHaveBeenCalledTimes(plays);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('skips every haptic when haptics are off but still plays sound', () => {
    feedback.win();
    const { player } = playerFor('win');
    const plays = player!.play.mock.calls.length;
    jest.mocked(Haptics.impactAsync).mockClear();
    jest.mocked(Haptics.notificationAsync).mockClear();

    updateSettings({ haptics: false });
    feedback.pick();
    feedback.drop();
    feedback.complete();
    feedback.win();
    jest.runOnlyPendingTimers();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(player!.play).toHaveBeenCalledTimes(plays + 1);
  });

  it('mixes with other audio and respects the silent switch, set up once', () => {
    feedback.pick();
    feedback.drop();
    feedback.complete();
    feedback.win();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  });
});
