// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="compare-page">
          <div className="warn">⚠️ Ошибка: {this.state.error.message}</div>
          <pre className="muted small" style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })}>Повторить</button>
        </div>
      );
    }
    return this.props.children;
  }
}