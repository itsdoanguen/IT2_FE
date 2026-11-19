import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  X,
  Download,
  FileText,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertTriangle,
  MessageSquareText,
  Search,
  ClipboardCheck,
} from 'lucide-react';
import { Regulation } from '../types';
import { regulationApi } from '../services/api';
import { renderSafeMarkdown, sanitizeHtml, cleanDisplayText } from '../utils/sanitize';
import { useModalDismiss } from '../hooks/useModalDismiss';
import {
  buildAiChatUrl,
  buildCatalogUrl,
  buildProcedureUrl,
  findRelatedProcedureId,
} from '../utils/crossTabLinks';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDF_DOCUMENT_OPTIONS = {
  disableRange: true,
  disableStream: true,
};

interface Props {
  regulation: Regulation | null;
  onClose: () => void;
  highlightClause?: string;
  initialPage?: number;
}

export const DocumentViewerModal: React.FC<Props> = ({
  regulation,
  onClose,
  highlightClause,
  initialPage = 1,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('pdf');
  const [useNativePdfFrame, setUseNativePdfFrame] = useState<boolean>(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
  const [scale, setScale] = useState<number>(1.05);
  const [pdfError, setPdfError] = useState<boolean>(false);

  const { backdropProps } = useModalDismiss(Boolean(regulation), onClose);

  // When opened from a chat citation (id may be 0/synthetic), resolve the real regulation by documentNumber.
  const needsLookup = Boolean(regulation && (!regulation.id || regulation.id <= 0) && regulation.documentNumber);
  const { data: resolvedReg } = useQuery({
    queryKey: ['regulation-by-number', regulation?.documentNumber],
    queryFn: () => regulationApi.getByNumber(regulation!.documentNumber),
    enabled: needsLookup,
    retry: false,
  });

  const activeReg = resolvedReg ?? regulation;
  const activeId = activeReg && activeReg.id > 0 ? activeReg.id : null;

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['regulation-content', activeId],
    queryFn: () => regulationApi.getContent(activeId!),
    enabled: Boolean(activeId),
    retry: false,
  });

  useEffect(() => {
    const hasPdfSource = Boolean(
      (activeReg?.id && activeReg.id > 0) || activeReg?.pdfUrl,
    );
    setPageNumber(initialPage && initialPage > 0 ? initialPage : 1);
    setNumPages(0);
    setPdfError(false);
    setUseNativePdfFrame(false);
    setViewMode(hasPdfSource ? 'pdf' : 'text');
  }, [regulation?.documentNumber, regulation?.id, activeReg?.id, activeReg?.pdfUrl, initialPage]);

  if (!regulation || !activeReg) return null;

  const pdfStreamUrl = activeId ? regulationApi.getPdfUrl(activeId) : activeReg.pdfUrl;
  const externalPdfUrl = activeReg.pdfUrl || pdfStreamUrl;
  const relatedProcedureId = findRelatedProcedureId(activeReg);

  const renderedHtml = (() => {
    if (contentData?.contentHtml) {
      return sanitizeHtml(contentData.contentHtml);
    }
    if (contentData?.markdown) {
      return renderSafeMarkdown(contentData.markdown, highlightClause);
    }
    if (activeReg.contentHtml) {
      return sanitizeHtml(activeReg.contentHtml);
    }
    return '';
  })();

  const handleAskAboutDoc = () => {
    const docNum = activeReg.documentNumber;
    const title = cleanDisplayText(activeReg.title);
    const clauseNote = highlightClause ? ` (đặc biệt nội dung ${highlightClause})` : '';
    const question = `Tóm tắt các quy định quan trọng và điều kiện áp dụng cho sinh viên trong văn bản ${docNum}${title ? ` — "${title}"` : ''}${clauseNote}.`;
    onClose();
    navigate(buildAiChatUrl({ q: question, doc: docNum, autoSend: true }));
  };

  const handleOpenInCatalog = () => {
    const docNum = activeReg.documentNumber;
    onClose();
    navigate(buildCatalogUrl({ q: docNum }));
  };

  const handleOpenProcedure = () => {
    if (!relatedProcedureId) return;
    onClose();
    navigate(buildProcedureUrl(relatedProcedureId));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
      {...backdropProps}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-modal-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-dut-800 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-dut-800">
                  {activeReg.documentNumber}
                </span>
                {activeReg.status && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {activeReg.status}
                  </span>
                )}
              </div>
              <h2
                id="doc-viewer-title"
                className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 mt-0.5"
              >
                {cleanDisplayText(activeReg.title)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                disabled={!pdfStreamUrl}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
                  viewMode === 'pdf' ? 'bg-dut-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF gốc</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'text' ? 'bg-dut-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Tóm tắt &amp; Số hóa</span>
              </button>
            </div>

            {externalPdfUrl && (
              <a
                href={pdfStreamUrl || externalPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-dut-800 text-white rounded-lg hover:bg-dut-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải PDF</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình đọc (Esc)"
              title="Đóng (Esc)"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Notice */}
        {highlightClause && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span>
              Đang đối chiếu trích dẫn: <strong>{highlightClause}</strong>
            </span>
            {initialPage > 1 && <span className="font-semibold">Trang tham chiếu: {initialPage}</span>}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {viewMode === 'text' ? (
            <div className="p-5 sm:p-8 space-y-5 text-sm text-slate-800 leading-relaxed bg-white min-h-full max-w-4xl mx-auto shadow-sm">
              <div className="text-center pb-4 border-b border-slate-200">
                <p className="font-semibold uppercase tracking-wider text-xs text-slate-500">
                  {activeReg.issuer || 'Trường Đại học Bách khoa – ĐHĐN'}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-dut-800 mt-1">
                  Số hiệu: {activeReg.documentNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ban hành ngày: {activeReg.issuedDate || 'Đang cập nhật'}
                </p>
              </div>

              {(activeReg.summary || activeReg.matchedExcerpt) && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-dut-800">
                    {activeReg.matchedExcerpt ? 'Nội dung liên quan được trích xuất' : 'Trích yếu văn bản'}
                  </h4>
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                    {cleanDisplayText(activeReg.matchedExcerpt || activeReg.summary || activeReg.title)}
                  </p>
                </div>
              )}

              {contentLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-dut-800" />
                  <span>Đang tải toàn văn bản số hóa...</span>
                </div>
              ) : renderedHtml ? (
                <div
                  className="legal-prose max-w-none text-slate-800 space-y-2.5 leading-7"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="p-5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 text-center space-y-2">
                  <p>Chưa có bản text số hóa cục bộ cho văn bản này.</p>
                  {pdfStreamUrl && (
                    <button
                      type="button"
                      onClick={() => setViewMode('pdf')}
                      className="text-dut-800 font-semibold hover:underline"
                    >
                      Chuyển sang tab PDF gốc để xem trực tiếp
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center space-y-3">
              {/* PDF Toolbar */}
              <div className="flex flex-wrap items-center justify-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 min-w-[90px] text-center">
                  Trang {pageNumber} / {numPages || '?'}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}
                  disabled={Boolean(numPages && pageNumber >= numPages)}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                  className="p-1.5 rounded-md hover:bg-slate-100"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-600">{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
                  className="p-1.5 rounded-md hover:bg-slate-100"
                  aria-label="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {pdfStreamUrl && useNativePdfFrame ? (
                <div className="w-full max-w-4xl h-[68vh] bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <iframe
                    src={pdfStreamUrl}
                    title={`PDF ${activeReg.documentNumber}`}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : pdfStreamUrl && !pdfError ? (
                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 overflow-x-auto max-w-full">
                  <Document
                    file={pdfStreamUrl}
                    options={PDF_DOCUMENT_OPTIONS}
                    onLoadSuccess={({ numPages: total }) => {
                      setNumPages(total);
                      setPdfError(false);
                      if (pageNumber > total) setPageNumber(1);
                    }}
                    onLoadError={() => setPdfError(true)}
                    loading={
                      <div className="flex items-center gap-2 py-16 px-8 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-dut-800" />
                        <span>Đang tải file PDF gốc...</span>
                      </div>
                    }
                  >
                    <Page pageNumber={pageNumber} scale={scale} />
                  </Document>
                </div>
              ) : (
                <div className="bg-white border border-amber-200 rounded-lg p-6 text-center max-w-md space-y-3">
                  <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-700 font-medium">
                    Không thể hiển thị trực tiếp PDF qua trình đọc nhúng (tệp nguồn chậm hoặc đang đồng bộ).
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {pdfStreamUrl && (
                      <button
                        type="button"
                        onClick={() => setUseNativePdfFrame(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dut-800 text-white hover:bg-dut-700"
                      >
                        Mở trình xem PDF trình duyệt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewMode('text')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      Xem bản tóm tắt &amp; số hóa
                    </button>
                    {externalPdfUrl && (
                      <a
                        href={externalPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Mở link gốc DUT
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Cross-Tab Actions */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {pathname !== '/ai-chat' && (
              <button
                type="button"
                onClick={handleAskAboutDoc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-dut-800 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Hỏi về văn bản này</span>
              </button>
            )}
            {pathname !== '/' && activeReg.documentNumber && (
              <button
                type="button"
                onClick={handleOpenInCatalog}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Mở trong Tra cứu</span>
              </button>
            )}
            {relatedProcedureId && pathname !== '/procedure' && (
              <button
                type="button"
                onClick={handleOpenProcedure}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Xem thủ tục liên quan</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="hidden sm:inline text-[11px] text-slate-400">
              Nhấn Esc hoặc bấm ra ngoài để đóng
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-dut-800 text-white text-xs font-semibold rounded-lg hover:bg-dut-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
