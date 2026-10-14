import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { feedback } from './feedback';

jest.mock('../assets/sounds/pick.wav', () => 'pick');
jest.mock('../assets/sounds/drop.wav', () => 'drop');
jest.mock('../assets/sounds/complete.wav', () => 'complete');
jest.mock('../assets/sounds/win.wav', () => 'win');
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
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

describe('feedback', () => {
  it('ticks and plays a click when a piece is picked up', () => {
    feedback.pick();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    expect(playerFor('pick').player!.play).toHaveBeenCalled();
  });

  it('uses a light tap for a drop, a heavy one for a completed rod, and success for a win', () => {
    feedback.drop();
    feedback.complete();
    feedback.win();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
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

  it('mixes with other audio and respects the silent switch, set up once', () => {
    feedback.pick();
    feedback.drop();
    feedback.complete();
    feedback.win();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  });
});
