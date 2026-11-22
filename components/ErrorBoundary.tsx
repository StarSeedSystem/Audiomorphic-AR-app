import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare readonly props: Readonly<Props>;
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ha ocurrido un error inesperado.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Error de Base de Datos: ${parsed.error}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">¡Ups! Algo salió mal</h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-full transition-colors cursor-pointer"
                onClick={() => window.location.reload()}
              >
                Recargar Aplicación
              </button>
              <button
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2 px-5 rounded-full transition-colors cursor-pointer"
                onClick={() => {
                  try {
                    localStorage.removeItem('audiomorphic_params');
                  } catch {
                    /* ignore */
                  }
                  window.location.reload();
                }}
              >
                Restablecer Ajustes y Recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
