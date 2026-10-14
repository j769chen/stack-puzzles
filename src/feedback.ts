import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import complete from '../assets/sounds/complete.wav';
import drop from '../assets/sounds/drop.wav';
import pick from '../assets/sounds/pick.wav';
import win from '../assets/sounds/win.wav';

const sounds = { pick, drop, complete, win };
type Sound = keyof typeof sounds;

const players = new Map<Sound, AudioPlayer>();

function play(sound: Sound) {
  let player = players.get(sound);
  if (!player) {
    if (players.size === 0) setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
    player = createAudioPlayer(sounds[sound]);
    players.set(sound, player);
  }
  player.seekTo(0);
  player.play();
}

export const feedback = {
  pick() {
    Haptics.selectionAsync();
    play('pick');
  },
  drop() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('drop');
  },
  complete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    play('complete');
  },
  win() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('win');
  },
};
