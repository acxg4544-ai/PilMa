'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Copy, X } from 'lucide-react';

export function BugReporter() {
    const [bugLog, setBugLog] = useState<string | null>(null);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const log = `[PilMa Bug Report]\nMsg: ${event.message}\nFile: ${event.filename}\nLine: ${event.lineno}:${event.colno}\nStack: ${event.error?.stack || 'N/A'}\nTime: ${new Date().toLocaleString()}`;
            setBugLog(log);
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const log = `[PilMa Async Bug Report]\nReason: ${event.reason}\nTime: ${new Date().toLocaleString()}`;
            setBugLog(log);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    if (!bugLog) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(bugLog).then(() => {
            alert('버그 로그가 클립보드에 복사되었습니다. 안티그래비티에 붙여넣어주세요!');
            setBugLog(null);
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border-2 border-red-500 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-red-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle size={20} />
                        <span>프로그램 오류 발생</span>
                    </div>
                    <button onClick={() => setBugLog(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-[14px] leading-relaxed text-[var(--text-primary)]">
                        죄송합니다. 프로그램 실행 중 오류가 발생했습니다.<br/>
                        아래 버튼을 눌러 로그를 복사한 뒤, <b>안티그래비티</b>에 전달해주시면 즉시 해결해 드리겠습니다.
                    </p>
                    <div className="bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)] overflow-auto max-h-[150px]">
                        <pre className="text-[11px] text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">
                            {bugLog}
                        </pre>
                    </div>
                    <button
                        onClick={copyToClipboard}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-[0.98]"
                    >
                        <Copy size={18} />
                        버그 로그 복사하고 닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
