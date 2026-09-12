/**
 * Dialog Component Example and Demo
 * 
 * This file demonstrates all Dialog component features and serves as
 * a manual testing interface.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Dialog } from './Dialog';
import { Button } from '../basic/Button';
import { useTheme } from '../../hooks/useTheme';

export const DialogExample: React.FC = () => {
  const { tokens } = useTheme();
  const [alertVisible, setAlertVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [customVisible, setCustomVisible] = useState(false);
  const [noActionsVisible, setNoActionsVisible] = useState(false);
  const [singleActionVisible, setSingleActionVisible] = useState(false);
  const [longContentVisible, setLongContentVisible] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: tokens.colors.onBackground }]}>
        Dialog Component Examples
      </Text>

      {/* Alert Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Alert Dialog
        </Text>
        <Button
          variant="filled"
          onPress={() => setAlertVisible(true)}
        >
          Show Alert
        </Button>
        <Dialog
          visible={alertVisible}
          onDismiss={() => setAlertVisible(false)}
          type="alert"
          title="Delete Item"
          actions={[
            {
              label: 'OK',
              onPress: () => setAlertVisible(false),
              variant: 'primary',
            },
          ]}
        >
          This action cannot be undone. The item will be permanently deleted.
        </Dialog>
      </View>

      {/* Confirmation Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Confirmation Dialog
        </Text>
        <Button
          variant="filled"
          onPress={() => setConfirmationVisible(true)}
        >
          Show Confirmation
        </Button>
        <Dialog
          visible={confirmationVisible}
          onDismiss={() => setConfirmationVisible(false)}
          type="confirmation"
          title="Save Changes"
          actions={[
            {
              label: 'Cancel',
              onPress: () => setConfirmationVisible(false),
              variant: 'secondary',
            },
            {
              label: 'Save',
              onPress: () => {
                console.log('Saved!');
                setConfirmationVisible(false);
              },
              variant: 'primary',
            },
          ]}
        >
          Do you want to save your changes before closing?
        </Dialog>
      </View>

      {/* Custom Content Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Custom Content Dialog
        </Text>
        <Button
          variant="filled"
          onPress={() => setCustomVisible(true)}
        >
          Show Custom Dialog
        </Button>
        <Dialog
          visible={customVisible}
          onDismiss={() => setCustomVisible(false)}
          title="Settings"
          actions={[
            {
              label: 'Cancel',
              onPress: () => setCustomVisible(false),
            },
            {
              label: 'Apply',
              onPress: () => {
                console.log('Applied settings!');
                setCustomVisible(false);
              },
              variant: 'primary',
            },
          ]}
        >
          <View style={{ gap: tokens.spacing.md }}>
            <Text style={{ color: tokens.colors.onSurface }}>
              Custom form content can go here
            </Text>
            <Text style={{ color: tokens.colors.onSurfaceVariant }}>
              • Setting option 1
            </Text>
            <Text style={{ color: tokens.colors.onSurfaceVariant }}>
              • Setting option 2
            </Text>
            <Text style={{ color: tokens.colors.onSurfaceVariant }}>
              • Setting option 3
            </Text>
          </View>
        </Dialog>
      </View>

      {/* No Actions Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Dialog Without Actions
        </Text>
        <Button
          variant="outlined"
          onPress={() => setNoActionsVisible(true)}
        >
          Show No Actions Dialog
        </Button>
        <Dialog
          visible={noActionsVisible}
          onDismiss={() => setNoActionsVisible(false)}
          title="Information"
          actions={[]}
        >
          This dialog has no action buttons. Tap the scrim (background) or press Escape to dismiss.
        </Dialog>
      </View>

      {/* Single Action Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Single Action Dialog
        </Text>
        <Button
          variant="outlined"
          onPress={() => setSingleActionVisible(true)}
        >
          Show Single Action
        </Button>
        <Dialog
          visible={singleActionVisible}
          onDismiss={() => setSingleActionVisible(false)}
          title="Success"
          actions={[
            {
              label: 'Got it',
              onPress: () => setSingleActionVisible(false),
              variant: 'primary',
            },
          ]}
        >
          Your changes have been saved successfully!
        </Dialog>
      </View>

      {/* Long Content Dialog */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Long Content Dialog (Scrollable)
        </Text>
        <Button
          variant="outlined"
          onPress={() => setLongContentVisible(true)}
        >
          Show Long Content
        </Button>
        <Dialog
          visible={longContentVisible}
          onDismiss={() => setLongContentVisible(false)}
          title="Terms and Conditions"
          actions={[
            {
              label: 'Decline',
              onPress: () => setLongContentVisible(false),
            },
            {
              label: 'Accept',
              onPress: () => {
                console.log('Accepted terms');
                setLongContentVisible(false);
              },
              variant: 'primary',
            },
          ]}
        >
          <View style={{ gap: tokens.spacing.sm }}>
            <Text style={{ color: tokens.colors.onSurface }}>
              This is a very long content that demonstrates scrolling behavior.
            </Text>
            {Array.from({ length: 20 }).map((_, i) => (
              <Text
                key={i}
                style={{ color: tokens.colors.onSurfaceVariant }}
              >
                Section {i + 1}: Lorem ipsum dolor sit amet, consectetur
                adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua.
              </Text>
            ))}
          </View>
        </Dialog>
      </View>

      {/* Keyboard Support Info */}
      <View style={[styles.section, { marginTop: tokens.spacing.xl }]}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Keyboard Support
        </Text>
        <Text style={{ color: tokens.colors.onSurfaceVariant, lineHeight: 20 }}>
          When a dialog is open:{'\n'}
          • Press <Text style={{ fontWeight: 'bold' }}>Enter</Text> to activate the primary action{'\n'}
          • Press <Text style={{ fontWeight: 'bold' }}>Escape</Text> to dismiss the dialog{'\n'}
          • Press <Text style={{ fontWeight: 'bold' }}>Tab</Text> to navigate between buttons
        </Text>
      </View>

      {/* Screen Size Info */}
      <View style={[styles.section, { marginBottom: tokens.spacing.xl }]}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.onSurface }]}>
          Responsive Layout
        </Text>
        <Text style={{ color: tokens.colors.onSurfaceVariant, lineHeight: 20 }}>
          • <Text style={{ fontWeight: 'bold' }}>Mobile (&lt; 600dp)</Text>: Full-width with margins{'\n'}
          • <Text style={{ fontWeight: 'bold' }}>Tablet/Desktop (≥ 600dp)</Text>: Max-width 560dp, centered{'\n'}
          • Buttons stack vertically on mobile, horizontal on tablet
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});

export default DialogExample;
