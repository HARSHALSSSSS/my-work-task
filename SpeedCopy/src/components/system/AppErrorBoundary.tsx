import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep a console trace in development for faster issue triage.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('AppErrorBoundary caught an error', error);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>Please try reopening this screen.</Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.9}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#1F2937',
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
