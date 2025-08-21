import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#ff0080',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Monaco, "Lucida Console", "Courier New", monospace'
        }}>
          <h1 style={{ color: '#ff0080', marginBottom: '20px' }}>🚨 VISUAL SYNTH ERROR</h1>
          <div style={{ 
            background: '#1a1a2e', 
            border: '2px solid #ff0080', 
            padding: '20px', 
            borderRadius: '5px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <h3 style={{ color: '#00ff41', marginBottom: '10px' }}>Error Details:</h3>
            <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#fff' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            {this.state.errorInfo && (
              <>
                <h3 style={{ color: '#00ff41', marginBottom: '10px', marginTop: '15px' }}>Component Stack:</h3>
                <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap', color: '#ccc' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#ff0080',
              color: '#0a0a0a',
              border: 'none',
              padding: '15px 30px',
              fontSize: '16px',
              fontFamily: 'inherit',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            🔄 RELOAD VISUAL SYNTH
          </button>
          <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
            This error has been logged to the console for debugging
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;