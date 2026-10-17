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
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Soft: 'soft', Rigid: 'rigid', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

type MockPlayer = { seekTo: jest.Mock; play: jest.Mock };

const players = new Map<string, MockPlayer>();
let preparedAudioModes: unknown[][] = [];

function playerFor(sound: string) {
  return { player: players.get(sound) };
}

beforeAll(async () => {
  await feedback.prepare();
  const created = jest.mocked(createAudioPlayer).mock;
  created.calls.forEach(([source], i) => players.set(source as string, created.results[i]!.value as MockPlayer));
  preparedAudioModes = jest.mocked(setAudioModeAsync).mock.calls.slice();
});
beforeEach(() => jest.useFakeTimers());
afterEach(() => updateSettings({ sound: true, haptics: true }));

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
  });

  it('creates each sound once and rewinds it before replaying', () => {
    feedback.pick();
    const { player } = playerFor('pick');
    const plays = player!.play.mock.calls.length;
    feedback.pick();
    feedback.pick();
    expect(players.size).toBe(6);
    expect(createAudioPlayer).not.toHaveBeenCalled();
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

  it('mixes with other audio and respects the silent switch, set up once', async () => {
    feedback.pick();
    feedback.drop();
    feedback.complete();
    feedback.win();
    await feedback.prepare();
    expect(preparedAudioModes).toEqual([[{ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }]]);
    expect(setAudioModeAsync).not.toHaveBeenCalled();
  });

  it('keeps the game going when a sound cannot play', async () => {
    const { player } = playerFor('pick');
    player!.play.mockImplementationOnce(() => {
      throw new Error('audio session unavailable');
    });
    player!.seekTo.mockRejectedValueOnce(new Error('seek'));
    jest.mocked(Haptics.impactAsync).mockClear().mockRejectedValueOnce(new Error('no vibrator'));
    expect(() => feedback.pick()).not.toThrow();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('soft');
    await Promise.resolve();
    feedback.pick();
    expect(player!.play).toHaveBeenLastCalledWith();
  });
});

describe('preparing sounds', () => {
  function freshFeedback() {
    const audio = jest.requireMock<typeof import('expo-audio')>('expo-audio');
    jest.mocked(audio.setAudioModeAsync).mockClear();
    jest.mocked(audio.createAudioPlayer).mockClear();
    const { feedback: fresh } = jest.requireActual<typeof import('./feedback')>('./feedback');
    return { audio, fresh };
  }

  it('sets the audio mode before loading any sound, and plays nothing until then', async () => {
    await jest.isolateModulesAsync(async () => {
      const { audio, fresh } = freshFeedback();
      let modeSet = () => {};
      jest.mocked(audio.setAudioModeAsync).mockReturnValueOnce(new Promise<void>((resolve) => (modeSet = resolve)));
      const preparing = fresh.prepare();
      fresh.pick();
      expect(audio.createAudioPlayer).not.toHaveBeenCalled();
      modeSet();
      await preparing;
      expect(audio.createAudioPlayer).toHaveBeenCalledTimes(6);
      fresh.pick();
      const pick = jest.mocked(audio.createAudioPlayer).mock.results[0]!.value as MockPlayer;
      expect(pick.play).toHaveBeenCalledTimes(1);
    });
  });

  it('starts preparing on the first sound if nothing prepared it', async () => {
    await jest.isolateModulesAsync(async () => {
      const { audio, fresh } = freshFeedback();
      fresh.pick();
      expect(audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
      await fresh.prepare();
      expect(audio.createAudioPlayer).toHaveBeenCalledTimes(6);
    });
  });

  it('stays silent when the audio mode cannot be set', async () => {
    await jest.isolateModulesAsync(async () => {
      const { audio, fresh } = freshFeedback();
      jest.mocked(audio.setAudioModeAsync).mockRejectedValueOnce(new Error('session'));
      await fresh.prepare();
      expect(() => fresh.pick()).not.toThrow();
      expect(audio.createAudioPlayer).not.toHaveBeenCalled();
    });
  });
});
