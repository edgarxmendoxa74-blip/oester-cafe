import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    textAlign: 'center',
                    background: '#FDF8F5',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <h1 style={{ color: '#D9232D', marginBottom: '16px' }}>Oops! Something went wrong.</h1>
                    <p style={{ color: '#6B5D57', marginBottom: '24px' }}>
                        We're sorry for the inconvenience. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#D9232D',
                            color: 'white',
                            border: 'none',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Refresh Page
                    </button>
                    {import.meta.env.DEV && (
                        <pre style={{
                            marginTop: '40px',
                            padding: '20px',
                            background: '#eee',
                            borderRadius: '8px',
                            textAlign: 'left',
                            overflow: 'auto',
                            maxWidth: '100%'
                        }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
