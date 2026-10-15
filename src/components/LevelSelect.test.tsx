import { fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { LevelSelect } from './LevelSelect';

type BackPressHandler = Parameters<typeof BackHandler.addEventListener>[1];

async function renderSelect(overrides: Partial<Parameters<typeof LevelSelect>[0]> = {}) {
  const props = {
    title: 'Test Game',
    count: 8,
    unlocked: 3,
    current: 2,
    stars: { 1: 3, 2: 1 },
    onPick: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  await render(<LevelSelect {...props} />);
  return props;
}

afterEach(() => jest.restoreAllMocks());

describe('LevelSelect', () => {
  it('lists every level with its stars, and locks the ones not reached', async () => {
    await renderSelect();
    expect(screen.getByRole('header', { name: 'Test Game' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Level 1, 3 of 3 stars' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2, 1 of 3 stars' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 3, not solved' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 4, locked' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Level 8, locked' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Level 9/ })).toBeNull();
  });

  it('marks the level being played', async () => {
    await renderSelect();
    expect(screen.getByRole('button', { name: 'Level 2, 1 of 3 stars' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Level 1, 3 of 3 stars' })).not.toBeSelected();
  });

  it('picks an unlocked level and ignores locked ones', async () => {
    const props = await renderSelect();
    await fireEvent.press(screen.getByRole('button', { name: 'Level 4, locked' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Level 3, not solved' }));
    expect(jest.mocked(props.onPick).mock.calls).toEqual([[3]]);
  });

  it('goes back from the header button and the hardware back button', async () => {
    let backPress: BackPressHandler = () => false;
    const remove = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      backPress = handler;
      return { remove };
    });
    const props = await renderSelect();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(backPress({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
    expect(props.onBack).toHaveBeenCalledTimes(2);
    screen.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('opens scrolled near the level being played', async () => {
    await renderSelect({ count: 400, unlocked: 400, current: 350, stars: {} });
    expect(screen.getByRole('button', { name: 'Level 350, not solved' })).toBeSelected();
    expect(screen.queryByRole('button', { name: 'Level 1, not solved' })).toBeNull();
  });
});
