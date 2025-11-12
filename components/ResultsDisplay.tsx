
import React, { useState, useRef } from 'react';
import type { AnalysisResult } from '../types';
import { Icon } from './Icon';

// Fix: Add type declarations for jspdf and html2canvas on the global window object.
// These libraries are likely loaded via script tags and are not imported,
// so TypeScript needs to be informed of their existence to avoid compilation errors.
declare global {
    interface Window {
        jspdf: {
            jsPDF: new (options?: any) => {
                addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => any;
                save: (filename: string) => void;
            };
        };
        html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    }
}

interface ResultsDisplayProps {
    result: AnalysisResult;
}

type Tab = 'html' | 'markdown' | 'pdf' | 'audio';

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
    const [activeTab, setActiveTab] = useState<Tab>('html');
    const htmlContentRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleDownloadPdf = async () => {
        const { jsPDF } = window.jspdf;
        const html2canvas = window.html2canvas;

        if (htmlContentRef.current && jsPDF && html2canvas) {
            setIsGeneratingPdf(true);
            try {
                const canvas = await html2canvas(htmlContentRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                    format: [canvas.width, canvas.height],
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('analise-arquitetura-ia.pdf');
            } catch (error) {
                console.error("Error generating PDF:", error);
                alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }
    };

    const TabButton: React.FC<{ tab: Tab; label: string; icon: string }> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            <Icon name={icon} className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Resultados da Análise</h2>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="flex flex-wrap items-center space-x-2 sm:space-x-4 -mb-px">
                    <TabButton tab="html" label="Página Web" icon="html" />
                    <TabButton tab="markdown" label="Markdown" icon="markdown" />
                    <TabButton tab="pdf" label="PDF" icon="pdf" />
                    {result.audioBase64 && <TabButton tab="audio" label="Áudio" icon="audio" />}
                </nav>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                {activeTab === 'html' && (
                    <div ref={htmlContentRef} dangerouslySetInnerHTML={{ __html: result.html }} />
                )}
                {activeTab === 'markdown' && (
                    <pre className="whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                        <code>{result.markdown}</code>
                    </pre>
                )}
                {activeTab === 'pdf' && (
                    <div>
                        <p className="mb-4">Clique no botão abaixo para gerar e baixar um arquivo PDF do relatório no formato de página web.</p>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400"
                        >
                            <Icon name="pdf" className="w-5 h-5" />
                            {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                        </button>
                    </div>
                )}
                {activeTab === 'audio' && result.audioBase64 && (
                    <div>
                        <p className="mb-4">Ouça o resumo executivo da análise gerado por IA.</p>
                        <audio controls className="w-full">
                            <source src={`data:audio/mpeg;base64,${result.audioBase64}`} type="audio/mpeg" />
                            Seu navegador não suporta o elemento de áudio.
                        </audio>
                    </div>
                )}
            </div>
        </div>
    );
};
