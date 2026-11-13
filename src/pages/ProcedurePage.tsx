import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Send, CheckSquare, Award, Download, FileText, FileDown } from 'lucide-react';
import { procedureApi, docApi } from '../services/api';
import { downloadFile } from '../utils/download';

// Doc to load the download link from (GET /api/docs/{id}). Override with VITE_DOC_ID in .env.
const DOC_ID = Number(import.meta.env.VITE_DOC_ID) || 1;

const getFileName = (url: string, fallback: string) => {
  try {
    const name = decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() || '');
    return name || fallback;
  } catch {
    return fallback;
  }
};

export const ProcedurePage: React.FC = () => {
  const studentCode = '102230001';
  const [feedbackReason, setFeedbackReason] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{ ticketCode: string } | null>(null);

  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);

  const { data: doc, isLoading: docLoading, isError: docError } = useQuery({
    queryKey: ['doc', DOC_ID],
    queryFn: () => docApi.getById(DOC_ID),
  });

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!doc?.file_url) return;
    setDownloadError(null);

    const isSameOrigin = new URL(doc.file_url, window.location.origin).origin === window.location.origin;
    if (!isSameOrigin) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloading(true);
    try {
      await downloadFile(doc.file_url, getFileName(doc.file_url, `${doc.title || 'tai-lieu'}.pdf`));
    } catch {
      setDownloadError('Không tải được tệp. Vui lòng thử lại sau hoặc liên hệ phòng Đào tạo & CTSV.');
    } finally {
      setDownloading(false);
    }
  };

  const { data: evaluation } = useQuery({
    queryKey: ['procedure-evaluation', studentCode],
    queryFn: () => procedureApi.evaluate(studentCode),
  });

  const ticketMutation = useMutation({
    mutationFn: (reason: string) =>
      procedureApi.submitTicket({
        studentCode,
        procedureName: 'Học bổng Khuyến khích Học tập',
        reason,
      }),
    onSuccess: (data) => {
      setSubmittedTicket(data);
      setFeedbackReason('');
    },
  });

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((i) => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  const steps = evaluation?.checklistSteps || [
    'Kiểm tra điểm số và điều kiện học phần ban đầu (Đã hoàn thành)',
    'Đối soát danh sách công bố dự kiến của Khoa/Phòng Đào tạo',
    'Nộp phản hồi/khiếu nại nếu có sai lệch điểm TBCHK hoặc ĐRL',
    'Nhận thông báo quyết định cấp học bổng chính thức',
  ];

  const progressPercent = Math.round((completedSteps.length / steps.length) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-dut-on-surface">
          Chi tiết Thủ tục & Đối soát Tiêu chuẩn
        </h2>
        <p className="text-sm text-dut-on-surface-variant mt-1">
          Quy trình tự động hóa đối chiếu kết quả học tập với Quyết định 1414/QĐ-ĐHBK về xét cấp học bổng sinh viên.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Criteria Table & Eligibility Matcher (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Eligibility Alert Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-dut-on-surface flex items-center space-x-2">
                <Award className="w-5 h-5 text-dut-primary" />
                <span>Kết quả đối soát hồ sơ học kỳ</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                ĐỦ TIÊU CHUẨN LOẠI GIỎI
              </span>
            </div>

            <p className="text-sm text-gray-700 bg-dut-surface-container-low p-4 rounded-xl border border-dut-outline-variant/30">
              {evaluation?.statusMessage || 'Hồ sơ đạt tiêu chuẩn Học bổng Loại Giỏi: ĐTBCHK 8.35 (>= 8.00) và ĐRL 86 (>= 80 đ).'}
            </p>

            {/* Criteria Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-dut-on-surface-variant font-semibold bg-dut-surface-container">
                    <th className="py-2.5 px-3 rounded-l-lg">Hạng mức Học bổng</th>
                    <th className="py-2.5 px-3">Điểm TBCHK (Thang 10)</th>
                    <th className="py-2.5 px-3">Điểm Rèn Luyện</th>
                    <th className="py-2.5 px-3 rounded-r-lg">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-dut-primary">Loại Xuất sắc</td>
                    <td className="py-3 px-3">≥ 9.00</td>
                    <td className="py-3 px-3">≥ 90 đ</td>
                    <td className="py-3 px-3 text-gray-400">Chưa đạt</td>
                  </tr>
                  <tr className="bg-blue-50/60 font-semibold border-l-4 border-dut-primary">
                    <td className="py-3 px-3 text-dut-primary flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Loại Giỏi</span>
                    </td>
                    <td className="py-3 px-3 text-dut-primary">8.00 - 8.99 (Đạt: 8.35)</td>
                    <td className="py-3 px-3 text-emerald-700">≥ 80 đ (Đạt: 86 đ)</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">Đủ điều kiện</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-dut-primary">Loại Khá</td>
                    <td className="py-3 px-3">7.00 - 7.99</td>
                    <td className="py-3 px-3">≥ 65 đ</td>
                    <td className="py-3 px-3 text-gray-500">Đạt mức cao hơn</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Constraints */}
            <div className="text-xs text-dut-on-surface-variant space-y-1 pt-2 border-t border-gray-100">
              <p className="font-semibold text-gray-800">Điều kiện kỹ thuật loại trừ cần ghi nhớ:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                <li>Tích lũy tối thiểu 15 tín chỉ trong kỳ học chính (Hiện tại tích lũy: 18 tín chỉ/kỳ).</li>
                <li>Không có học phần nào thi lần đầu dưới điểm D (hoặc điểm F).</li>
                <li>Không trong thời gian chịu hình thức kỷ luật từ khiển trách trở lên.</li>
              </ul>
            </div>
          </div>

          {/* Stepper Checklist Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-dut-on-surface flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-dut-primary" />
                <span>Quy trình theo dõi 4 chặng (Interactive Stepper)</span>
              </h3>
              <span className="text-xs font-bold text-dut-primary bg-dut-primary/10 px-2.5 py-1 rounded-full">
                {progressPercent}% hoàn thành
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-dut-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps list */}
            <div className="space-y-3 pt-2">
              {steps.map((step, idx) => {
                const isChecked = completedSteps.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-blue-50/50 border-dut-primary/40 text-dut-on-surface'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded text-dut-primary focus:ring-dut-primary border-gray-300 cursor-pointer"
                    />
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold mr-1">Chặng {idx + 1}:</span>
                      <span>{step}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Submission / Feedback Form (1 col) */}
        <div className="space-y-6">
        {/* Downloads Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
          <div className="flex items-center space-x-2 text-dut-on-surface">
            <Download className="w-5 h-5 text-dut-primary" />
            <h3 className="font-bold text-base">Biểu mẫu & Văn bản</h3>
          </div>

          {doc?.title && (
            <p className="text-xs text-dut-on-surface-variant">{doc.title}</p>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !doc?.file_url}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-dut-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-dut-primary-container disabled:opacity-50 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>{downloading ? 'Đang tải...' : 'Tải tài liệu'}</span>
          </button>

          {docLoading && (
            <p className="text-xs text-dut-on-surface-variant">Đang tải thông tin tài liệu...</p>
          )}

          {docError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              Không lấy được thông tin tài liệu từ máy chủ.
            </p>
          )}

          {doc && !doc.file_url && (
            <p className="text-xs text-dut-on-surface-variant">Tài liệu này chưa có tệp đính kèm.</p>
          )}

          {downloadError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              {downloadError}
            </p>
          )}
        </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex items-center space-x-2 text-dut-on-surface">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Phản hồi sai lệch học vụ</h3>
            </div>
            <p className="text-xs text-dut-on-surface-variant">
              Nếu phát hiện sai sót trong điểm TBCHK hoặc điểm rèn luyện dự kiến, sinh viên nộp phản hồi trực tuyến để phòng Đào tạo & CTSV đối soát.
            </p>

            {submittedTicket && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1 animate-fade-in">
                <p className="font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã tiếp nhận phản hồi thành công!</span>
                </p>
                <p>Mã biên nhận: <strong className="font-mono text-sm text-emerald-800">{submittedTicket.ticketCode}</strong></p>
                <p className="text-[11px] text-emerald-700">Thời gian phản hồi dự kiến: 24 - 48 giờ làm việc.</p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (feedbackReason.trim()) {
                  ticketMutation.mutate(feedbackReason);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung khiếu nại / đề nghị đối soát:
                </label>
                <textarea
                  rows={4}
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  placeholder="Ví dụ: Điểm môn Giải tích 2 thi lần đầu 8.5 nhưng danh sách dự kiến ghi 7.5..."
                  className="w-full text-xs sm:text-sm p-3 bg-dut-surface-container-low border border-dut-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-dut-primary focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={ticketMutation.isPending || !feedbackReason.trim()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-dut-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-dut-primary-container disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{ticketMutation.isPending ? 'Đang gửi...' : 'Nộp đề nghị xem xét'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
