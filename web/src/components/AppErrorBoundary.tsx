import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="fatal-error-page">
        <div className="fatal-error-card" role="alert">
          <AlertTriangle size={32} aria-hidden="true" />
          <h1>화면을 표시하는 중 문제가 발생했습니다.</h1>
          <p>
            입력한 데이터는 브라우저 저장소에 남아 있을 수 있습니다. 페이지를 새로고침한 뒤
            다시 시도해 주세요.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={16} aria-hidden="true" />
            페이지 새로고침
          </button>
        </div>
      </main>
    );
  }
}
