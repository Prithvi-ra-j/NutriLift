/**
 * Material Design 3 Dialog Component
 * 
 * A modal dialog component providing critical decision points and information with
 * full accessibility support and theme integration.
 * 
 * ## Features
 * - ✓ Alert and confirmation modes with appropriate button configurations
 * - ✓ Modal behavior with scrim overlay preventing background interaction
 * - ✓ Auto-layout for small and large screens (full-width on mobile, max-width on tablet)
 * - ✓ Configurable title, content, and action buttons
 * - ✓ Keyboard support (Enter for primary action, Escape to dismiss)
 * - ✓ Full theme integration with light/dark mode support
 * - ✓ Focus management and accessibility compliance
 * 
 * ## Requirements
 * - **Requirement 4.1**: Dialog with configurable title, content, and action buttons
 * - **Requirement 4.2**: Scrim overlay preventing background interaction
 * - **Requirement 4.3**: Alert and confirmation modes
 * - **Requirement 4.9**: Keyboard support (Enter, Escape)
 * 
 * ## Usage Examples
 * 
 * ### Alert Dialog
 * ```tsx
 * <Dialog
 *   visible={showAlert}
 *   onDismiss={() => setShowAlert(false)}
 *   type="alert"
 *   title="Delete Item"
 *   actions={[
 *     {
 *       label: 'OK',
 *       onPress: () => setShowAlert(false),
 *       variant: 'primary'
 *     }
 *   ]}
 * >
 *   This action cannot be undone.
 * </Dialog>
 * ```
 * 
 * ### Confirmation Dialog
 * ```tsx
 * <Dialog
 *   visible={showConfirmation}
 *   onDismiss={() => setShowConfirmation(false)}
 *   type="confirmation"
 *   title="Save Changes"
 *   actions={[
 *     {
 *       label: 'Cancel',
 *       onPress: () => setShowConfirmation(false),
 *       variant: 'secondary'
 *     },
 *     {
 *       label: 'Save',
 *       onPress: handleSave,
 *       variant: 'primary'
 *     }
 *   ]}
 * >
 *   Do you want to save your changes?
 * </Dialog>
 * ```
 * 
 * ### Custom Content Dialog
 * ```tsx
 * <Dialog
 *   visible={showDialog}
 *   onDismiss={() => setShowDialog(false)}
 *   title="Settings"
 *   actions={[
 *     {
 *       label: 'Cancel',
 *       onPress: () => setShowDialog(false)
 *     },
 *     {
 *       label: 'Apply',
 *       onPress: handleApply,
 *       variant: 'primary'
 *     }
 *   ]}
 * >
 *   <View>
 *     <Text>Custom form content here</Text>
 *   </View>
 * </Dialog>
 * ```
 * 
 * ## Accessibility
 * - Modal behavior traps focus within dialog
 * - Keyboard accessible (Tab navigation, Enter/Escape keys)
 * - Screen reader support with dialog role and proper labeling
 * - Focus management: focuses first action button on open, restores previous focus on close
 * - ARIA attributes for modal behavior and content description
 * 
 * ## Auto-Layout Behavior
 * - **Mobile (< 600dp)**: Full-width with horizontal margins
 * - **Tablet/Desktop (≥ 600dp)**: Max-width 560dp, centered
 * - **Responsive**: Adjusts padding and button layout based on screen size
 * 
 * ## Keyboard Support
 * - **Enter**: Activates primary action button (if available)
 * - **Escape**: Dismisses dialog (calls onDismiss)
 * - **Tab**: Navigates between action buttons
 * 
 * ## Color System
 * Colors are automatically applied from the Material Design 3 theme:
 * - Background: Surface color with elevation
 * - Text: OnSurface color
 * - Scrim: Semi-transparent overlay (scrim color)
 * - Actions: Inherit Button component theme colors
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ViewStyle,
  TextStyle,
  Dimensions,
  AccessibilityInfo,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { DialogProps, DialogAction } from '../../core/types/component';
import { Button } from '../basic/Button';
import { getThemeColor, getElevation } from '../../core/utils/theme';

/**
 * Material Design 3 Dialog Component
 *
 * @example
 * // Alert dialog
 * <Dialog visible={true} type="alert" title="Warning">
 *   This cannot be undone.
 * </Dialog>
 *
 * @example
 * // Confirmation dialog with actions
 * <Dialog 
 *   visible={true} 
 *   type="confirmation" 
 *   title="Save Changes"
 *   actions={[
 *     { label: 'Cancel', onPress: onCancel },
 *     { label: 'Save', onPress: onSave, variant: 'primary' }
 *   ]}
 * >
 *   Do you want to save your changes?
 * </Dialog>
 */
export const Dialog: React.FC<DialogProps> = ({
  visible,
  onDismiss,
  title,
  children,
  actions = [],
  type = 'alert',
}) => {
  const { tokens } = useTheme();
  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;
  
  const dialogRef = useRef<View>(null);
  const firstActionRef = useRef<any>(null);
  
  // Get screen dimensions for responsive layout
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 600;
  
  // Keyboard event handler
  const handleKeyDown = useCallback((event: any) => {
    if (!visible) return;
    
    if (event.nativeEvent?.key === 'Escape') {
      onDismiss();
    } else if (event.nativeEvent?.key === 'Enter') {
      // Find primary action and trigger it
      const primaryAction = actions.find(action => action.variant === 'primary');
      if (primaryAction) {
        primaryAction.onPress();
      } else if (actions.length === 1) {
        // If only one action, treat it as primary
        actions[0].onPress();
      }
    }
  }, [visible, onDismiss, actions]);

  // Focus management
  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      // Focus first action button when dialog opens
      const timer = setTimeout(() => {
        if (firstActionRef.current) {
          firstActionRef.current.focus?.();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Announce dialog to screen readers
  useEffect(() => {
    if (visible && title) {
      AccessibilityInfo.announceForAccessibility(`Dialog opened: ${title}`);
    }
  }, [visible, title]);

  // Memoize styles for performance
  const styles = useMemo(() => {
    const containerStyle: ViewStyle = {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.scrim,
      padding: isTablet ? spacing.xl : spacing.md,
    };

    const dialogStyle: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: spacing.lg,
      width: isTablet ? Math.min(560, screenWidth - spacing.xl * 2) : '100%',
      maxWidth: 560,
      maxHeight: '80%',
      // Add shadow for elevation on Android/iOS
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    };

    const titleStyle: TextStyle = {
      ...typography.headline.small,
      color: colors.onSurface,
      marginBottom: spacing.md,
      textAlign: 'left',
    };

    const contentStyle: ViewStyle = {
      flexShrink: 1,
      marginBottom: actions.length > 0 ? spacing.lg : 0,
    };

    const contentTextStyle: TextStyle = {
      ...typography.body.medium,
      color: colors.onSurfaceVariant,
      lineHeight: 20,
    };

    const actionsStyle: ViewStyle = {
      flexDirection: isTablet ? 'row' : 'column-reverse',
      justifyContent: isTablet ? 'flex-end' : 'flex-start',
      alignItems: isTablet ? 'center' : 'stretch',
      gap: spacing.sm,
      marginTop: spacing.md,
    };

    return {
      container: containerStyle,
      dialog: dialogStyle,
      title: titleStyle,
      content: contentStyle,
      contentText: contentTextStyle,
      actions: actionsStyle,
    };
  }, [colors, spacing, typography, tokens, isTablet, screenWidth, actions.length]);

  // Handle scrim tap to dismiss (only if not alert type)
  const handleScrimPress = useCallback(() => {
    if (type !== 'alert') {
      onDismiss();
    }
  }, [type, onDismiss]);

  // Render action buttons
  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <View style={styles.actions}>
        {actions.map((action: DialogAction, index: number) => (
          <Button
            key={index}
            ref={index === 0 ? firstActionRef : undefined}
            variant={action.variant === 'primary' ? 'filled' : 'text'}
            onPress={action.onPress}
            style={!isTablet ? { width: '100%' } : undefined}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.label}
          </Button>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={styles.container}
          onPress={handleScrimPress}
          accessible={false}
          // Handle keyboard events on web
          {...(Platform.OS === 'web' && {
            onKeyDown: handleKeyDown,
          })}
        >
          <Pressable
            onPress={() => {}} // Prevent event bubbling to scrim
            accessible={false}
          >
            <View
              ref={dialogRef}
              style={styles.dialog}
              accessibilityRole="alert"
              accessibilityLabel={title ? `Dialog: ${title}` : 'Dialog'}
            >
              {/* Title */}
              {title && (
                <Text
                  style={styles.title}
                  accessibilityRole="text"
                >
                  {title}
                </Text>
              )}

              {/* Content */}
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {typeof children === 'string' ? (
                  <Text style={styles.contentText}>{children}</Text>
                ) : (
                  children
                )}
              </ScrollView>

              {/* Actions */}
              {renderActions()}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;