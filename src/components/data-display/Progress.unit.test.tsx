// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import { Progress } from './Progress';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        primary: '#6750A4',
        surfaceVariant: '#E7E0EC',
        onSurface: '#1C1B1F',
      },
      typography: {
        label: { large: { fontSize: 14 } },
      },
    },
  }),
}));

describe('Progress Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders linear progress by default', () => {
    const { getByRole } = render(<Progress value={0.5} />);
    const progressbar = getByRole('progressbar');
    expect(progressbar).toBeTruthy();
  });

  it('renders circular progress', () => {
    const { getByRole } = render(<Progress variant="circular" value={0.5} />);
    const progressbar = getByRole('progressbar');
    expect(progressbar).toBeTruthy();
  });

  it('renders label and percentage', () => {
    const { getByText } = render(
      <Progress value={0.75} label="Loading" showPercentage />
    );
    expect(getByText('Loading')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
  });

  it('does not show percentage when indeterminate', () => {
    const { queryByText } = render(
      <Progress indeterminate label="Loading" showPercentage />
    );
    // Even if showPercentage is true, it shouldn't render 'NaN%' or anything similar when indeterminate
    const texts = queryByText(/%/);
    expect(texts).toBeNull();
  });
});
