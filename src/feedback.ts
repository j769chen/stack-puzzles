import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import complete from '../assets/sounds/complete.wav';
import drop1 from '../assets/sounds/drop1.wav';
import drop2 from '../assets/sounds/drop2.wav';
import drop3 from '../assets/sounds/drop3.wav';
import pick from '../assets/sounds/pick.wav';
import win from '../assets/sounds/win.wav';
import { getSettings } from './settings';

const sounds = { pick, drop1, drop2, drop3, complete, win };
const DROPS = ['drop1', 'drop2', 'drop3'] as const;
const SECOND_NOTE_MS = 90;

let drops = 0;
type Sound = keyof typeof sounds;

const players = new Map<Sound, AudioPlayer>();
let audioMode: Promise<void> | null = null;

function createMissingPlayers() {
  for (const sound of Object.keys(sounds) as Sound[]) {
    try {
      if (!players.has(sound)) players.set(sound, createAudioPlayer(sounds[sound]));
    } catch {}
  }
}

function prepare(): Promise<void> {
  audioMode ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  return audioMode.then(createMissingPlayers, () => {
    audioMode = null;
  });
}

function play(sound: Sound) {
  if (!getSettings().sound) return;
  const player = players.get(sound);
  if (!player) {
    prepare();
    return;
  }
  try {
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {}
}

function buzz(haptic: () => Promise<void>) {
  if (getSettings().haptics) haptic().catch(() => {});
}

export const feedback = {
  prepare,
  pick() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    play('pick');
  },
  drop() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    play(DROPS[drops++ % DROPS.length]!);
  },
  complete() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    setTimeout(() => buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), SECOND_NOTE_MS);
    play('complete');
  },
  win() {
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    play('win');
  },
};
