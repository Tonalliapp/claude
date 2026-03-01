import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-white text-xl font-medium mb-2">Algo salió mal</h1>
            <p className="text-silver-muted text-sm mb-6">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            {this.state.error && (
              <pre className="bg-tonalli-black-card border border-subtle rounded-xl p-3 text-red-400 text-xs text-left mb-6 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
              >
                <RefreshCw size={14} />
                Reintentar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-5 py-2.5 rounded-xl bg-gold text-tonalli-black text-sm font-semibold hover:bg-gold-light transition-colors"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
