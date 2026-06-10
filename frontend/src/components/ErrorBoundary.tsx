import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-primary">Something went wrong</h2>
          <p className="mb-6 text-secondary">
            We caught an error and couldn't render this part of the page.
          </p>
          {this.state.error && (
            <details className="mb-4 text-left text-sm text-secondary bg-muted p-4 rounded">
              <summary className="font-medium cursor-pointer">Error details</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap">{this.state.error.message}</pre>
            </details>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleRetry}
              className="rounded-lg bg-accent px-6 py-2 font-semibold text-background transition-colors hover:bg-orange-600"
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Try again
            </button>
            <Link
              to="/"
              className="rounded-lg border border-border bg-surface px-6 py-2 font-semibold text-primary transition-colors hover:bg-background"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}