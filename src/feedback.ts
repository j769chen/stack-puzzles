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

function play(sound: Sound) {
  if (!getSettings().sound) return;
  let player = players.get(sound);
  if (!player) {
    if (players.size === 0) setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
    player = createAudioPlayer(sounds[sound]);
    players.set(sound, player);
  }
  player.seekTo(0);
  player.play();
}

function buzz(haptic: () => Promise<void>) {
  if (getSettings().haptics) haptic();
}

export const feedback = {
  pick() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    play('pick');
  },
  drop() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    play(DROPS[drops++ % DROPS.length]);
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
