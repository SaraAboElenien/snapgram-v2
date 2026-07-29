import { Component } from 'react';
import { Sentry } from '@/lib/sentry';

// React error boundaries require a class component — no hook equivalent
// exists (still true as of React 19). See PHASE3_SECURITY_SCOPE.md Finding 7.
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
    Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-center flex-col w-screen h-screen gap-4 text-light-1">
          <p className="body-bold md:h3-bold">Something went wrong.</p>
          <button
            className="shad-button_primary px-5 py-2 rounded-lg"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
