// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Badge } from './Badge';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        error: '#B3261E',
        onError: '#FFFFFF',
      },
      typography: {
        label: { small: { fontSize: 11 } },
      },
    },
  }),
}));

describe('Badge Component', () => {
  it('renders standard badge with content', async () => {
    const { getByText } = await render(<Badge content={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('renders max value with +', async () => {
    const { getByText } = await render(<Badge content={1000} max={999} />);
    expect(getByText('999+')).toBeTruthy();
  });

  it('renders dot variant without text', async () => {
    const { queryByText } = await render(<Badge variant="dot" content={5} />);
    expect(queryByText('5')).toBeNull();
  });

  it('hides badge when visible is false', async () => {
    const { queryByText } = await render(<Badge content={5} visible={false} />);
    expect(queryByText('5')).toBeNull();
  });

  it('renders wrapping children', async () => {
    const { getByText } = await render(
      <Badge content={3}>
        <Text>AnchorText</Text>
      </Badge>
    );
    expect(getByText('AnchorText')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });
});
