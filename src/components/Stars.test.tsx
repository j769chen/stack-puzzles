import { render, screen } from '@testing-library/react-native';
import { Stars } from './Stars';

describe('Stars', () => {
  it('draws earned stars filled and the rest as outlines, so they differ by more than color', async () => {
    await render(<Stars count={2} />);
    const stars = screen.getByLabelText('2 of 3 stars');
    expect(stars).toHaveTextContent('★★☆');
  });
});
