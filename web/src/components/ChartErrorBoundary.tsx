import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw, X } from "lucide-react";
import { isChunkLoadError } from "../utils/chunkLoadError";

type ChartErrorBoundaryProps = {
  children: ReactNode;
  onClose: () => void;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
  /** 차트 조각 파일을 못 받았다 — 새로 고치면 풀린다. */
  needsReload: boolean;
};

export default class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = {
    hasError: false,
    needsReload: false,
  };

  static getDerivedStateFromError(error: unknown): ChartErrorBoundaryState {
    return {
      hasError: true,
      needsReload: isChunkLoadError(error),
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { needsReload } = this.state;

    return (
      <div className="chart-card" role="alert">
        <div className="chart-header-row">
          <div>
            <h3 className="chart-title">
              <AlertTriangle size={18} aria-hidden="true" />{" "}
              {needsReload ? "차트를 불러오지 못했습니다." : "차트를 표시하지 못했습니다."}
            </h3>
            <p className="chart-subtitle">
              {needsReload
                ? "사이트가 새 버전으로 바뀌었거나 연결이 끊겼을 수 있습니다. 새로 고치면 다시 볼 수 있습니다. 넣어 둔 점수와 지망은 그대로 남습니다."
                : "나머지 시뮬레이터 기능은 계속 사용할 수 있습니다."}
            </p>
            {needsReload && (
              <button
                type="button"
                className="btn-reload-chart"
                onClick={() => window.location.reload()}
              >
                <RotateCw size={15} aria-hidden="true" />
                새로 고침
              </button>
            )}
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
