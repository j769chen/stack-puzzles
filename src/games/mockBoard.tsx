import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

export type MockBoardProps = {
  rods: number[][];
  selected: number | null;
  onPress: (rod: number) => void;
  onDrop: (rod: number) => void;
};

export function MockBoard({ rods, selected, onPress, onDrop }: MockBoardProps) {
  return rods.map((rod, i) => (
    <Pressable key={i} testID={`rod-${i}`} onPress={() => onPress(i)} onLongPress={() => onDrop(i)}>
      <Text testID={`rod-${i}-pieces`}>{`${selected === i ? '*' : ''}${rod.join(',')}`}</Text>
    </Pressable>
  ));
}

export const rod = (i: number) => screen.getByTestId(`rod-${i}`);

export const rodText = (i: number) => screen.getByTestId(`rod-${i}-pieces`).props.children as string;

export async function move(from: number, to: number) {
  await fireEvent.press(rod(from));
  await fireEvent.press(rod(to));
}

export async function drag(from: number, to: number) {
  await fireEvent.press(rod(from));
  await fireEvent(rod(to), 'longPress');
}
