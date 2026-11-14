import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";
import { canShareImageFile } from "../utils/captureImage";

type BasketCaptureDialogProps = {
  imageUrl: string;
  file: File;
  onClose: () => void;
};

/**
 * 만든 사진을 보여 주고 저장하게 한다.
 *
 * 사진을 만들자마자 저장·공유를 부르지 않고 한 번 보여 주는 까닭: 폰의 공유 창은 방금 누른 손길이
 * 있어야 열리는데, 사진을 만드는 동안 그 손길이 지나가 버린다. 여기서 단추를 다시 누르게 하면
 * 어느 기기에서나 열린다. 사진을 길게 눌러 저장하는 길도 같이 생긴다.
 */
export default function BasketCaptureDialog({ imageUrl, file, onClose }: BasketCaptureDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const canShare = canShareImageFile(file);

  useEffect(() => {
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const share = () => {
    setShareFailed(false);
    void navigator.share({ files: [file], title: "국립대 9곳 편입 비교 — 내 지망" }).catch((error: unknown) => {
      // 공유 창을 그냥 닫은 것은 실패가 아니다.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setShareFailed(true);
      }
    });
  };

  return createPortal(
    <div
      className="capture-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="capture-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="capture-dialog-header">
          <h2 id={titleId}>사진으로 저장</h2>
          <button
            type="button"
            className="capture-close"
            aria-label="사진 저장 창 닫기"
            onClick={onClose}
            ref={closeRef}
          >
            <X size={18} />
          </button>
        </header>

        <div className="capture-preview">
          <img src={imageUrl} alt="지망 장바구니를 찍은 사진 미리보기" />
        </div>

        <p className="capture-hint">
          {canShare
            ? "‘갤러리에 저장·공유’를 누른 뒤 ‘이미지 저장’을 고르면 갤러리에 들어갑니다. 사진을 길게 눌러 저장할 수도 있습니다."
            : "‘사진 내려받기’를 누르면 내려받기 폴더에 저장됩니다."}
          {" "}사진에는 넣어 둔 점수가 함께 들어갑니다.
        </p>
        {shareFailed && (
          <p className="capture-hint capture-hint--failed" role="status">
            공유 창을 열지 못했습니다. 사진을 길게 눌러 저장하거나 ‘사진 내려받기’를 눌러 주세요.
          </p>
        )}

        <div className="capture-actions">
          {canShare && (
            <button type="button" className="capture-action capture-action--primary" onClick={share}>
              <Share2 size={16} aria-hidden="true" />
              갤러리에 저장·공유
            </button>
          )}
          <a
            className={`capture-action ${canShare ? "" : "capture-action--primary"}`}
            href={imageUrl}
            download={file.name}
          >
            <Download size={16} aria-hidden="true" />
            사진 내려받기
          </a>
        </div>
      </section>
    </div>,
    document.body,
  );
}
