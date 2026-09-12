// @ts-nocheck
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Snackbar } from './Snackbar';

// Mock useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        primary: '#BB86FC',
        inverseSurface: '#121212',
        inverseOnSurface: '#FFFFFF',
        inversePrimary: '#D0BCFF',
        shadow: '#000000',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
      },
      typography: {
        body: { medium: { fontSize: 14 } },
        label: { large: { fontSize: 14 } },
      },
    },
  }),
}));

// Mock useSafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 20, left: 0 }),
}));

// Mock AccessibilityInfo
jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

describe('Snackbar Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <Snackbar visible={true} onDismiss={jest.fn()} message="Test message" />
    );

    expect(getByText('Test message')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(
      <Snackbar visible={false} onDismiss={jest.fn()} message="Test message" />
    );

    expect(queryByText('Test message')).toBeNull();
  });

  it('calls onDismiss after the specified duration', () => {
    const onDismissMock = jest.fn();
    render(
      <Snackbar
        visible={true}
        onDismiss={onDismissMock}
        message="Test message"
        duration={4000}
      />
    );

    expect(onDismissMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3999);
    });
    expect(onDismissMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it('renders action button and handles press', () => {
    const actionPressMock = jest.fn();
    const { getByText } = render(
      <Snackbar
        visible={true}
        onDismiss={jest.fn()}
        message="Test message"
        action={{ label: 'Undo', onPress: actionPressMock }}
      />
    );

    const actionButton = getByText('UNDO'); // Uppercase applied in component
    expect(actionButton).toBeTruthy();

    fireEvent.press(actionButton);
    expect(actionPressMock).toHaveBeenCalledTimes(1);
  });

  it('announces message to screen reader when visible', () => {
    render(
      <Snackbar visible={true} onDismiss={jest.fn()} message="Accessibility test" />
    );

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Accessibility test'
    );
  });
});
