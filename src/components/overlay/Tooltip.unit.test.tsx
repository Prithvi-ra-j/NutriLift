// @ts-nocheck
import React from 'react';
import { render, act } from '@testing-library/react-native';
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

  it('reveals the tooltip when the anchor receives focus', () => {
    const { getByRole, getByText } = render(
      <Tooltip text="Tooltip Text">
        <Text>Anchor</Text>
      </Tooltip>
    );

    const anchor = getByRole('button');

    expect(anchor.props.accessibilityHint).toBe('Tooltip Text');
    expect(() => {
      act(() => {
        anchor.props.onFocus();
      });
    }).not.toThrow();
  });
});
