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

  it('wires focus and blur handlers to the tooltip anchor', () => {
    const { getByRole } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    const anchor = getByRole('button');
    
    expect(anchor.props.onFocus).toEqual(expect.any(Function));
    expect(anchor.props.onBlur).toEqual(expect.any(Function));
  });

  it('wires a long-press handler to the tooltip anchor', () => {
    const { getByRole, getByText } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    const anchor = getByRole('button');

    // Pressable doesn't forward onLongPress to the host node directly; it's
    // consumed internally via the responder handlers, so exercise the actual
    // gesture lifecycle to confirm long-press reveals the tooltip.
    act(() => {
      anchor.props.onResponderGrant({ nativeEvent: {}, persist: () => {} });
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getByText('Tooltip Text')).toBeTruthy();
  });
});
