import { Component, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ChartErrorBoundaryProps = {
  children: ReactNode;
  onClose: () => void;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
};

export default class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="chart-card" role="alert">
        <div className="chart-header-row">
          <div>
            <h3 className="chart-title">
              <AlertTriangle size={18} aria-hidden="true" /> 차트를 표시하지 못했습니다.
            </h3>
            <p className="chart-subtitle">
              나머지 시뮬레이터 기능은 계속 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            className="btn-close-chart"
            aria-label="오류가 발생한 차트 닫기"
            onClick={this.props.onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }
}
