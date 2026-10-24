import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { Dialog } from '../components/overlay/Dialog';
import { Snackbar } from '../components/overlay/Snackbar';
import { ThemeContext } from '../core/theme/ThemeProvider';
import { lightThemeColors } from '../core/theme/colors';
import { spacingScale, typographyScales } from '../core/theme/typography';

const themeContextValue = {
  tokens: {
    colors: lightThemeColors,
    typography: typographyScales,
    spacing: spacingScale,
    elevation: {
      0: { elevation: 0 },
      1: { elevation: 1 },
      2: { elevation: 2 },
      3: { elevation: 3 },
      4: { elevation: 4 },
      5: { elevation: 5 },
    },
    touchTargetSize: 48,
  },
  isDark: false,
  toggleDarkMode: jest.fn(),
  setCustomTokens: jest.fn(),
};

const IntegrationFlow = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  return (
    <View testID="root-container">
      <Pressable testID="open-dialog" onPress={() => setDialogOpen(true)}>
        <Text>Open Dialog</Text>
      </Pressable>

      {dialogOpen ? (
        <Dialog
          visible
          onDismiss={() => setDialogOpen(false)}
          title="Confirm Action"
          actions={[
            {
              label: 'Confirm',
              onPress: () => {
                setDialogOpen(false);
                setSnackbarOpen(true);
              },
            },
          ]}
        >
          Are you sure you want to perform this action?
        </Dialog>
      ) : null}

      {snackbarOpen ? (
        <Snackbar
          visible
          message="Action completed successfully"
          onDismiss={() => setSnackbarOpen(false)}
          duration={0}
          action={{
            label: 'Undo',
            onPress: () => setSnackbarOpen(false),
          }}
        />
      ) : null}
    </View>
  );
};

describe('End-to-End Component Integration', () => {
  it('handles complex flow: open dialog -> confirm -> show snackbar', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <ThemeContext.Provider value={themeContextValue}>
        <IntegrationFlow />
      </ThemeContext.Provider>
    );
    expect(queryByText('Confirm Action')).toBeNull();
    expect(queryByText('Action completed successfully')).toBeNull();

    await fireEvent.press(getByTestId('open-dialog'));
    expect(getByText('Confirm Action')).toBeTruthy();

    await fireEvent.press(getByText('Confirm'));
    expect(queryByText('Confirm Action')).toBeNull();
    expect(getByText('Action completed successfully')).toBeTruthy();
  }, 15_000);
});
