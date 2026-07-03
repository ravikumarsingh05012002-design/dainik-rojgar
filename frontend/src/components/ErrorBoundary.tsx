import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadow } from '../theme';
import PrimaryButton from './PrimaryButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            <Text style={styles.message}>
              We encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            <View style={styles.buttonContainer}>
              <PrimaryButton
                label="Try Again"
                onPress={this.handleReset}
                variant="primary"
              />
            </View>

            {/* Error Details (only in development) */}
            {__DEV__ && error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {error.toString()}
                  </Text>
                  {errorInfo && (
                    <Text style={styles.errorStack}>
                      {errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
  errorDetails: {
    marginTop: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    ...shadow.card,
  },
  errorText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  errorStack: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 18,
  },
});

export default ErrorBoundary;
