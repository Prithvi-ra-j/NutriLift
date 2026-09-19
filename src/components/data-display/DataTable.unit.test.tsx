// @ts-nocheck
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DataTable } from './DataTable';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    tokens: {
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        outlineVariant: '#CAC4D0',
        primaryContainer: '#EADDFF',
        primary: '#6750A4',
      },
      spacing: { sm: 8, md: 16 },
      typography: {
        body: { medium: { fontSize: 14 } },
        label: { large: { fontSize: 14 }, medium: { fontSize: 12 } },
      },
    },
  }),
}));

describe('DataTable Component', () => {
  const mockColumns = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'calories', label: 'Calories', numeric: true, sortable: true },
  ];

  const mockData = [
    { id: '1', name: 'Apple', calories: 95 },
    { id: '2', name: 'Banana', calories: 105 },
  ];

  it('renders columns and data', () => {
    const { getByText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(getByText('Name')).toBeTruthy();
    expect(getByText('Calories')).toBeTruthy();
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('95')).toBeTruthy();
  });

  it('handles row selection', () => {
    const onSelectionChange = jest.fn();
    const { getAllByRole } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    // Assuming Checkbox has accessibilityRole="checkbox"
    // Since Checkbox is custom, we might just look for the first row checkbox
    const checkboxes = getAllByRole('checkbox');
    // First is 'select all', second is 'Apple'
    fireEvent.press(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('handles column sorting callbacks', () => {
    const onSort = jest.fn();
    const { getByText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onSort={onSort}
      />
    );

    const nameHeader = getByText('Name');
    fireEvent.press(nameHeader);

    expect(onSort).toHaveBeenCalledWith('name', true);

    fireEvent.press(nameHeader);
    expect(onSort).toHaveBeenCalledWith('name', false);
  });
});
