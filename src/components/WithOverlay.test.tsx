import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { WithOverlay } from './WithOverlay';

type Element = ReturnType<typeof screen.getByText>;

function hiddenFromTalkBack(element: Element) {
  for (let node: Element | null = element; node; node = node.parent) {
    if (node.props.importantForAccessibility === 'no-hide-descendants') return true;
  }
  return false;
}

describe('WithOverlay', () => {
  it('leaves the content reachable when nothing covers it', async () => {
    await render(
      <WithOverlay overlay={false}>
        <Text>game</Text>
      </WithOverlay>,
    );
    expect(hiddenFromTalkBack(screen.getByText('game'))).toBe(false);
  });

  it('hides the covered content from TalkBack and VoiceOver while the overlay shows', async () => {
    await render(
      <WithOverlay overlay={<Text>levels</Text>}>
        <Text>game</Text>
      </WithOverlay>,
    );
    expect(screen.getByText('levels')).toBeOnTheScreen();
    const game = screen.getByText('game', { includeHiddenElements: true });
    expect(hiddenFromTalkBack(game)).toBe(true);
    expect(screen.queryByText('game')).toBeNull();
  });
});
