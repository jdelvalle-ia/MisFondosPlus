import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PortfolioAnalysisReportProps {
    markdown: string;
    reportDate: string;
}

export const PortfolioAnalysisReport = forwardRef<HTMLDivElement, PortfolioAnalysisReportProps>(
    ({ markdown, reportDate }, ref) => {
        return (
            <div className="w-full bg-slate-100/50 p-8 flex justify-center print:p-0 print:bg-white">
                <style type="text/css" media="print">
                    {`
                        @page { 
                            margin: 25mm !important; 
                            size: A4;
                        }
                        body { 
                            print-color-adjust: exact; 
                            -webkit-print-color-adjust: exact; 
                        }
                    `}
                </style>
                <div ref={ref} className="bg-white text-slate-900 p-[25mm] min-h-[297mm] w-[210mm] shadow-xl print:shadow-none print:w-full print:p-0 mx-auto transform transition-all hover:scale-[1.005] duration-300">
                    {/* Header - Clean Modern Style */}
                    <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-12">
                        <div>
                            <h1 className="text-3xl font-sans font-bold text-slate-900 uppercase tracking-tight leading-none">
                                Informe de Estrategia <br /> <span className="text-sky-700">y Seguimiento</span>
                            </h1>
                            <p className="text-slate-500 uppercase tracking-widest text-[10px] mt-3 font-semibold">
                                MisFondos+ Wealth Management
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-xs text-slate-500 mb-1">{reportDate}</p>
                            <div className="bg-sky-800 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider inline-block">
                                Confidencial
                            </div>
                        </div>
                    </div>

                    {/* Content - High-End Professional with Custom Components */}
                    <div className="font-sans text-slate-800">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold uppercase tracking-wide text-sky-900 bg-slate-50 p-4 border-l-4 border-sky-800 mb-8 mt-10 break-after-avoid" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold uppercase text-slate-800 mt-8 mb-4 border-b border-slate-300 pb-2 break-after-avoid" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-slate-700 mt-6 mb-3 uppercase" {...props} />,
                                p: ({ node, ...props }) => <p className="text-sm leading-8 text-justify mb-6 text-slate-600" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-sm leading-7 text-slate-600" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-sm leading-7 text-slate-600" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                table: ({ node, ...props }) => <table className="w-full border-collapse border border-slate-300 my-8 text-xs font-sans shadow-sm" {...props} />,
                                thead: ({ node, ...props }) => <thead className="bg-slate-800 text-white" {...props} />,
                                tbody: ({ node, ...props }) => <tbody className="bg-white" {...props} />,
                                tr: ({ node, ...props }) => <tr className="even:bg-slate-50 border-b border-slate-200 last:border-0" {...props} />,
                                th: ({ node, ...props }) => <th className="p-3 text-left font-bold uppercase tracking-wider border border-slate-300 text-white" {...props} />,
                                td: ({ node, ...props }) => <td className="p-3 border border-slate-300 text-slate-700 font-medium" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                            }}
                        >
                            {markdown}
                        </ReactMarkdown>
                    </div>

                    {/* Footer */}
                    <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end print:break-before-auto">
                        <div className="text-left">
                            <p className="text-[10px] text-slate-400 font-medium">
                                MisFondos+ AI Engine
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                Documento Confidencial
                            </p>
                            <p className="text-[9px] text-slate-300 font-mono">ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PortfolioAnalysisReport.displayName = 'PortfolioAnalysisReport';
