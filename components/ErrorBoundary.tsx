import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our logging system
    logger.error("React Error Boundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-[#0A0A0F] p-6 justify-center">
          <View className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <Text className="text-red-400 font-dm-bold text-lg mb-2">
              Something went wrong
            </Text>
            <Text className="text-red-300 font-dm text-sm mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </Text>
            
            {this.state.error?.stack && (
              <ScrollView className="max-h-40 bg-black/30 rounded p-2 mb-4">
                <Text className="text-red-200 font-mono text-xs">
                  {this.state.error.stack}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-red-500 rounded-lg py-3 px-4 items-center"
            >
              <Text className="text-white font-dm-bold">Try Again</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-400 font-dm text-xs text-center">
            Error details have been logged for debugging
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
