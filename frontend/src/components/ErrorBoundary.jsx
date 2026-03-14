import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("UI crash prevented:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
            <div className="text-cyan-300 font-mono text-xs uppercase tracking-[0.3em] mb-3">Recovery Mode</div>
            <h1 className="text-2xl font-light mb-2">Something went wrong</h1>
            <p className="text-zinc-400 text-sm">The app hit an unexpected error, but the page stayed alive. Refresh to continue.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
