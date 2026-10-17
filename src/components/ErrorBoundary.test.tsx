import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never {
  throw new Error('no GL context');
}

describe('ErrorBoundary', () => {
  it('shows its children while they render', async () => {
    await render(
      <ErrorBoundary onBack={jest.fn()}>
        <Text>board</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('board')).toBeOnTheScreen();
  });

  it('replaces a screen that fails to render with a way back home', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const onBack = jest.fn();
    await render(
      <ErrorBoundary onBack={onBack}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to home' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    jest.mocked(console.error).mockRestore();
  });
});
