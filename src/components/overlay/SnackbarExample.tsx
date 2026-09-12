/**
 * Snackbar Example Component
 * 
 * Demonstrates the various usage patterns for the Snackbar component,
 * including simple messages, action buttons, custom durations, and queue management.
 */

import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Snackbar } from './Snackbar';
import { Button } from '../basic/Button';
import { Typography } from '../basic/Typography';

interface SnackbarData {
  id: number;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

/**
 * Example component showcasing Snackbar usage
 */
export const SnackbarExample: React.FC = () => {
  // Simple snackbar state
  const [showSimple, setShowSimple] = useState(false);
  
  // Snackbar with action state
  const [showWithAction, setShowWithAction] = useState(false);
  
  // Long duration snackbar state
  const [showLongDuration, setShowLongDuration] = useState(false);
  
  // Queue management state
  const [queue, setQueue] = useState<SnackbarData[]>([]);
  
  // Add snackbar to queue
  const addToQueue = (message: string, action?: SnackbarData['action'], duration?: number) => {
    setQueue(prev => [...prev, { id: Date.now(), message, action, duration }]);
  };
  
  // Remove first snackbar from queue
  const dismissFromQueue = () => {
    setQueue(prev => prev.slice(1));
  };
  
  // Action handlers
  const handleUndo = () => {
    console.log('Undo action triggered');
    setShowWithAction(false);
  };
  
  const handleRetry = () => {
    console.log('Retry action triggered');
    dismissFromQueue();
  };
  
  return (
    <ScrollView style={{ flex: 1, padding: 24 }}>
      <Typography variant="headline-medium" style={{ marginBottom: 24 }}>
        Snackbar Examples
      </Typography>
      
      {/* Simple Snackbar */}
      <View style={{ marginBottom: 24 }}>
        <Typography variant="title-medium" style={{ marginBottom: 8 }}>
          Simple Snackbar
        </Typography>
        <Typography variant="body-medium" style={{ marginBottom: 16, opacity: 0.7 }}>
          Auto-dismisses after 4 seconds (default)
        </Typography>
        <Button
          variant="filled"
          onPress={() => setShowSimple(true)}
        >
          Show Simple Snackbar
        </Button>
      </View>
      
      {/* Snackbar with Action */}
      <View style={{ marginBottom: 24 }}>
        <Typography variant="title-medium" style={{ marginBottom: 8 }}>
          Snackbar with Action
        </Typography>
        <Typography variant="body-medium" style={{ marginBottom: 16, opacity: 0.7 }}>
          Includes an action button for user interaction
        </Typography>
        <Button
          variant="filled"
          onPress={() => setShowWithAction(true)}
        >
          Show Snackbar with Action
        </Button>
      </View>
      
      {/* Long Duration Snackbar */}
      <View style={{ marginBottom: 24 }}>
        <Typography variant="title-medium" style={{ marginBottom: 8 }}>
          Custom Duration Snackbar
        </Typography>
        <Typography variant="body-medium" style={{ marginBottom: 16, opacity: 0.7 }}>
          Auto-dismisses after 10 seconds
        </Typography>
        <Button
          variant="filled"
          onPress={() => setShowLongDuration(true)}
        >
          Show Long Duration Snackbar
        </Button>
      </View>
      
      {/* Queue Management */}
      <View style={{ marginBottom: 24 }}>
        <Typography variant="title-medium" style={{ marginBottom: 8 }}>
          Snackbar Queue
        </Typography>
        <Typography variant="body-medium" style={{ marginBottom: 16, opacity: 0.7 }}>
          Multiple snackbars shown one at a time. Queue count: {queue.length}
        </Typography>
        <View style={{ gap: 8 }}>
          <Button
            variant="filled"
            onPress={() => addToQueue('First message in queue')}
          >
            Add to Queue (Simple)
          </Button>
          <Button
            variant="tonal"
            onPress={() => addToQueue('Failed to sync', { label: 'Retry', onPress: handleRetry })}
          >
            Add to Queue (With Action)
          </Button>
          <Button
            variant="outlined"
            onPress={() => addToQueue('Important notification', undefined, 8000)}
          >
            Add to Queue (8 seconds)
          </Button>
        </View>
      </View>
      
      {/* Simple Snackbar Instance */}
      <Snackbar
        visible={showSimple}
        onDismiss={() => setShowSimple(false)}
        message="Item deleted"
      />
      
      {/* Snackbar with Action Instance */}
      <Snackbar
        visible={showWithAction}
        onDismiss={() => setShowWithAction(false)}
        message="Message sent"
        action={{
          label: 'Undo',
          onPress: handleUndo,
        }}
      />
      
      {/* Long Duration Snackbar Instance */}
      <Snackbar
        visible={showLongDuration}
        onDismiss={() => setShowLongDuration(false)}
        message="This message will stay for 10 seconds"
        duration={10000}
      />
      
      {/* Queue Snackbar Instance */}
      <Snackbar
        visible={queue.length > 0}
        onDismiss={dismissFromQueue}
        message={queue[0]?.message || ''}
        action={queue[0]?.action}
        duration={queue[0]?.duration}
      />
    </ScrollView>
  );
};

export default SnackbarExample;
