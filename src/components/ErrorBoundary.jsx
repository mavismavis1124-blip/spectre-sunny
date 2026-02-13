import React from 'react';
import { useTranslation } from 'react-i18next';
import './ErrorBoundary.css';

/**
 * Error Boundary for catching lazy load failures
 * Provides fallback UI when a page fails to load
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page load error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleClose = () => {
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-glass">
            <div className="error-boundary-icon">⚠️</div>
            <h3 className="error-boundary-title">Failed to Load Page</h3>
            <p className="error-boundary-message">
              {this.state.error?.message || 'Something went wrong while loading this page.'}
            </p>
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-btn error-boundary-btn-retry"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button 
                className="error-boundary-btn error-boundary-btn-close"
                onClick={this.handleClose}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
