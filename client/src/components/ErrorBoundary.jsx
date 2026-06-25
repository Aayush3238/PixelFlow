import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('React error boundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-fallback">
          <h1>Something went wrong</h1>
          <p>Refresh the page to continue. Your uploaded images are still stored safely.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
