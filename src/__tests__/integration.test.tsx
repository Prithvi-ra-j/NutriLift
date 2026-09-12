// @ts-nocheck
import React, { useState } from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { ThemeProvider, Button, Dialog, Snackbar, useTheme } from '../components';

const IntegrationFlow = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { toggleDarkMode, isDark } = useTheme();

  return (
    <View testID="root-container">
      <Button testID="open-dialog" onPress={() => setDialogOpen(true)}>
        Open Dialog
      </Button>
      
      <Button testID="toggle-theme" onPress={toggleDarkMode}>
        Toggle {isDark ? 'Light' : 'Dark'} Mode
      </Button>

      <Dialog
        visible={dialogOpen}
        onDismiss={() => setDialogOpen(false)}
        title="Confirm Action"
        content="Are you sure you want to perform this action?"
        actions={
          <Button 
            testID="confirm-dialog"
            onPress={() => {
              setDialogOpen(false);
              setSnackbarOpen(true);
            }}
          >
            Confirm
          </Button>
        }
      />

      <Snackbar
        visible={snackbarOpen}
        message="Action completed successfully"
        onDismiss={() => setSnackbarOpen(false)}
        action={{
          label: 'Undo',
          onPress: () => setSnackbarOpen(false)
        }}
      />
    </View>
  );
};

describe('End-to-End Component Integration', () => {
  it('handles complex flow: open dialog -> confirm -> show snackbar', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <ThemeProvider initialDark={false}>
        <IntegrationFlow />
      </ThemeProvider>
    );

    // Initial state
    expect(queryByText('Confirm Action')).toBeNull();
    expect(queryByText('Action completed successfully')).toBeNull();

    // 1. Open Dialog
    await act(async () => {
      fireEvent.press(getByTestId('open-dialog'));
    });
    expect(getByText('Confirm Action')).toBeTruthy();

    // 2. Confirm Dialog
    await act(async () => {
      fireEvent.press(getByTestId('confirm-dialog'));
    });
    // Dialog should be closed, Snackbar should be visible
    expect(queryByText('Confirm Action')).toBeNull();
    expect(getByText('Action completed successfully')).toBeTruthy();

    // 3. Toggle Theme (verify context works alongside UI interactions)
    await act(async () => {
      fireEvent.press(getByTestId('toggle-theme'));
    });
    // Shouldn't crash, and context should update
    expect(getByTestId('toggle-theme').props.children).toContain('Light'); // because it switched to dark
  });
});
