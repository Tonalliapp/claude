import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <p style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Algo salió mal</p>
            <p style={{ color: '#8A8A8A', fontSize: '14px', marginBottom: '8px' }}>Intenta recargar la página</p>
            <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '16px', wordBreak: 'break-all' }}>{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #C9A84C', color: '#C9A84C', background: 'transparent', fontSize: '14px', cursor: 'pointer' }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
