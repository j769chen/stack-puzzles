import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Header } from './Header';

describe('Header', () => {
  it('shows the title with Back and an optional action', async () => {
    const onBack = jest.fn();
    const onPress = jest.fn();
    await render(<Header title="Ring Sort" onBack={onBack} action={{ label: 'Levels', onPress }} />);
    expect(screen.getByRole('header', { name: 'Ring Sort' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Levels' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('lets Back and the action share the free width instead of a fixed one, so large text fits', async () => {
    await render(<Header title="Daily Puzzle" onBack={jest.fn()} action={{ label: 'History', onPress: jest.fn() }} />);
    for (const name of ['Back', 'History']) {
      const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
      expect(style.flex).toBe(1);
      expect(style.width).toBeUndefined();
    }
  });
});
