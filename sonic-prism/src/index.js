import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

// Add global error handling for mobile debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  
  // Prevent the error from bubbling up and showing the error popup
  event.preventDefault();
  return true;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the unhandled rejection from bubbling up
  event.preventDefault();
});

// Override console.error to catch React error boundary errors
const originalConsoleError = console.error;
console.error = (...args) => {
  // Log the error but don't let it propagate to the error popup
  originalConsoleError.apply(console, args);
  
  // Check if this is a React error boundary error
  const errorMessage = args.join(' ');
  if (errorMessage.includes('Error boundary') || errorMessage.includes('React')) {
    // Suppress React-related errors from showing popups
    return;
  }
};

// Safety check for DOM element
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">ERROR: Root element not found. Please refresh the page.</div>';
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
