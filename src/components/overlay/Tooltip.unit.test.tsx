// @ts-nocheck
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Tooltip } from './Tooltip';

// Mock useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        inverseSurface: '#313033',
        inverseOnSurface: '#F4EFF4',
      },
      spacing: {
        sm: 8,
        md: 16,
      },
      typography: {
        label: { small: { fontSize: 11 } },
      },
    },
  }),
}));

describe('Tooltip Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    expect(getByText('Anchor')).toBeTruthy();
  });

  it('shows tooltip on focus and hides on blur', () => {
    const { getByText, queryByText } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    const anchor = getByText('Anchor');
    
    // Initially hidden
    expect(queryByText('Tooltip Text')).toBeNull();

    // Show on focus
    fireEvent(anchor, 'focus');
    
    act(() => {
      jest.advanceTimersByTime(150); // wait for animation
    });

    expect(getByText('Tooltip Text')).toBeTruthy();

    // Hide on blur
    fireEvent(anchor, 'blur');

    act(() => {
      jest.advanceTimersByTime(150); // wait for animation
    });

    // The modal sets visible to false after animation
    expect(queryByText('Tooltip Text')).toBeNull();
  });

  it('shows tooltip on long press', () => {
    const { getByText, queryByText } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    const anchor = getByText('Anchor');
    
    fireEvent(anchor, 'longPress');

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(getByText('Tooltip Text')).toBeTruthy();
  });
});
