import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import complete from '../assets/sounds/complete.wav';
import drop from '../assets/sounds/drop.wav';
import pick from '../assets/sounds/pick.wav';
import win from '../assets/sounds/win.wav';
import { getSettings } from './settings';

const sounds = { pick, drop, complete, win };
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
    buzz(Haptics.selectionAsync);
    play('pick');
  },
  drop() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    play('drop');
  },
  complete() {
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    play('complete');
  },
  win() {
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    play('win');
  },
};
