import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-900 font-sans text-center">
                    <span className="material-symbols-outlined text-6xl mb-4 text-red-500">error</span>
                    <h1 className="text-2xl font-bold mb-4">¡Ups! Algo ha salido mal</h1>
                    <p className="max-w-md mb-8 text-red-700">
                        La aplicación ha encontrado un error inesperado o faltan variables de entorno. Por favor, intenta recargar la página.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all font-sans"
                    >
                        Recargar aplicación
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
