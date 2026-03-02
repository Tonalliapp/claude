import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="text-white text-xl font-medium mb-2">Algo salio mal</h1>
            <p className="text-silver-muted text-sm mb-6">Ocurrio un error inesperado.</p>
            {this.state.error && (
              <pre className="bg-tonalli-black-card border border-subtle rounded-xl p-3 text-red-400 text-xs text-left mb-6 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold/10 transition-colors mx-auto"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
