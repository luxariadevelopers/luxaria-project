import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { LoadingScreen } from '../LoadingScreen';

/**
 * Component test using React Native Testing Library dependency stack
 * (react-test-renderer host under Jest node + RN mock).
 * Prefer `@testing-library/react-native` queries when running under jest-expo.
 */
function render(element: React.ReactElement) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return {
    getByText(text: string) {
      const hits = tree.root.findAll(
        (node) =>
          typeof node.props.children === 'string' &&
          node.props.children === text,
      );
      if (!hits.length) {
        throw new Error(`Unable to find an element with text: ${text}`);
      }
      return hits[0];
    },
  };
}

describe('LoadingScreen (component)', () => {
  it('renders default loading label', () => {
    const screen = render(<LoadingScreen />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders a custom label', () => {
    const screen = render(<LoadingScreen label="Syncing offline queue…" />);
    expect(screen.getByText('Syncing offline queue…')).toBeTruthy();
  });
});
