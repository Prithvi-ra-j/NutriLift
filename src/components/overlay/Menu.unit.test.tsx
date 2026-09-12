// @ts-nocheck
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Menu } from './Menu';

// Mock useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        surfaceContainer: '#F3F3F3',
        onSurface: '#000000',
        shadow: '#000000',
      },
      spacing: {
        sm: 8,
        md: 16,
      },
      typography: {
        label: { large: { fontSize: 14 } },
      },
    },
  }),
}));

describe('Menu Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockItems = [
    { key: '1', label: 'Item 1', onPress: jest.fn() },
    { key: '2', label: 'Item 2', onPress: jest.fn() },
  ];

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <Menu
        visible={true}
        onDismiss={jest.fn()}
        items={mockItems}
        anchor={<Text>Anchor</Text>}
      />
    );

    expect(getByText('Anchor')).toBeTruthy();
    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });

  it('does not render items when not visible', () => {
    const { getByText, queryByText } = render(
      <Menu
        visible={false}
        onDismiss={jest.fn()}
        items={mockItems}
        anchor={<Text>Anchor</Text>}
      />
    );

    expect(getByText('Anchor')).toBeTruthy();
    expect(queryByText('Item 1')).toBeNull();
  });

  it('calls onDismiss when pressing outside (overlay)', () => {
    const onDismissMock = jest.fn();
    const { getByLabelText } = render(
      <Menu
        visible={true}
        onDismiss={onDismissMock}
        items={mockItems}
        anchor={<Text>Anchor</Text>}
      />
    );

    const overlay = getByLabelText('Close menu');
    fireEvent.press(overlay);

    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it('calls item onPress and onDismiss when an item is pressed', () => {
    const onDismissMock = jest.fn();
    const { getByText } = render(
      <Menu
        visible={true}
        onDismiss={onDismissMock}
        items={mockItems}
        anchor={<Text>Anchor</Text>}
      />
    );

    const item1 = getByText('Item 1');
    fireEvent.press(item1);

    expect(onDismissMock).toHaveBeenCalledTimes(1);

    // Fast-forward timeout for item action
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockItems[0].onPress).toHaveBeenCalledTimes(1);
  });
});
