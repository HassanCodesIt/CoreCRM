import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-lg w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Application Crash Detected</h1>
            <p className="text-gray-600 mb-4">Something went wrong while rendering the page. Here is the technical error:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-x-auto text-xs mb-6">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
