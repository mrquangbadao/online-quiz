import React from "react";
import { Link } from "react-router-dom";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught", error, info);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Có lỗi xảy ra
          </h1>
          {import.meta.env.DEV && this.state.error?.message && (
            <p className="mt-2 text-sm text-red-500">
              {this.state.error.message}
            </p>
          )}
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-700 px-6 py-3 font-bold text-white transition-colors hover:bg-teal-600"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }
}
