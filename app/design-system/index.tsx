import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { Button, Dialog, Snackbar, Menu, Badge, Progress, List, DataTable, ThemeProvider, useTheme } from '../../src/components';

const ShowcaseContent = () => {
  const { tokens, isDark, toggleDarkMode } = useTheme();
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.background, padding: tokens.spacing.md }}>
      <Text style={{ ...tokens.typography.headline.large, color: tokens.colors.onBackground, marginBottom: tokens.spacing.md }}>
        Design System Showcase
      </Text>

      <Button variant="filled" onPress={toggleDarkMode}>
        Toggle {isDark ? 'Light' : 'Dark'} Mode
      </Button>

      <View style={{ marginVertical: tokens.spacing.lg }} />

      <Text style={{ ...tokens.typography.title.large, color: tokens.colors.onBackground, marginBottom: tokens.spacing.sm }}>
        Buttons
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
        <Button variant="filled" onPress={() => {}}>Filled</Button>
        <Button variant="outlined" onPress={() => {}}>Outlined</Button>
        <Button variant="text" onPress={() => {}}>Text</Button>
      </View>

      <View style={{ marginVertical: tokens.spacing.lg }} />

      <Text style={{ ...tokens.typography.title.large, color: tokens.colors.onBackground, marginBottom: tokens.spacing.sm }}>
        Badges & Progress
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg }}>
        <Badge content={5}>
          <View style={{ width: 40, height: 40, backgroundColor: tokens.colors.surfaceVariant, borderRadius: 8 }} />
        </Badge>
        <Progress variant="circular" value={75} />
      </View>

      <View style={{ marginVertical: tokens.spacing.lg }} />
      <Text style={{ ...tokens.typography.title.large, color: tokens.colors.onBackground, marginBottom: tokens.spacing.sm }}>
        Lists
      </Text>
      <List 
        items={[
          { key: '1', title: 'Item 1', subtitle: 'Subtitle 1' },
          { key: '2', title: 'Item 2', subtitle: 'Subtitle 2' }
        ]}
      />
    </ScrollView>
  );
};

export default function DesignSystemScreen() {
  return (
    <ThemeProvider>
      <ShowcaseContent />
    </ThemeProvider>
  );
}
