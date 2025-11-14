
import React, { useState, useEffect } from 'react';
import type { AnalysisResult } from '../types';
import { Icon } from './Icon';

// Fix: Add type declarations for jspdf and html2canvas on the global window object.
// These libraries are likely loaded via script tags and are not imported,
// so TypeScript needs to be informed of their existence to avoid compilation errors.
declare global {
    interface Window {
        jspdf: {
            jsPDF: any; // Using 'any' for simplicity as the full type is complex
        };
        html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    }
}

interface ResultsDisplayProps {
    result: AnalysisResult;
    onGenerateDiagram: () => void;
    isGeneratingDiagram: boolean;
}

type Tab = 'html' | 'markdown';

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onGenerateDiagram, isGeneratingDiagram }) => {
    const [activeTab, setActiveTab] = useState<Tab>('html');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isDiagramVisible, setIsDiagramVisible] = useState(false);

    useEffect(() => {
        const diagramElement = document.getElementById('aiGeneratedDiagram');
        setIsDiagramVisible(!!diagramElement);
    }, [result.html]);

    const showGenerateDiagramButton = result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]');

    const handleDownloadPdf = async () => {
        const { jsPDF } = window.jspdf;
        
        if (!result.html) {
            alert("Não há conteúdo HTML para gerar o PDF.");
            return;
        }

        setIsGeneratingPdf(true);

        // 1. Create a temporary, off-screen container for rendering.
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '515pt'; // A4 width (595pt) - horizontal margins (40+40)

        // 2. Create the content wrapper and apply Tailwind's prose styles.
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'prose prose-slate max-w-none';
        contentWrapper.innerHTML = result.html;
        container.appendChild(contentWrapper);
        
        // 3. Append to body to make it renderable by html2canvas.
        document.body.appendChild(container);

        try {
            // 4. Add a specific class to the body to trigger PDF-specific styles.
            document.body.classList.add('pdf-rendering');

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });

            // 5. Generate PDF from the temporary element.
            await pdf.html(contentWrapper, {
                margin: [40, 40, 40, 40],
                autoPaging: 'slice',
                html2canvas: {
                    scale: 0.7,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc: Document) => {
                        // Force light theme on the cloned document for consistent PDF output.
                        clonedDoc.documentElement.classList.remove('dark');
                    }
                },
                width: 515,
                windowWidth: 1024,
            });

            // 6. Save the generated PDF.
            pdf.save('analise-arquitetura-ia.pdf');

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
        } finally {
            // 7. Cleanup: remove temporary element and class, reset loading state.
            document.body.removeChild(container);
            document.body.classList.remove('pdf-rendering');
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!result.markdown) {
            alert("Conteúdo Markdown não disponível para download.");
            return;
        }

        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.md');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAudio = () => {
        if (!result.audioBase64) {
            alert("Resumo em áudio não disponível para download.");
            return;
        }

        const binaryString = window.atob(result.audioBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'resumo-arquitetura.mp3');
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleDownloadDiagram = () => {
        const imgElement = document.getElementById('aiGeneratedDiagram') as HTMLImageElement;
        if (!imgElement) {
            alert("Diagrama não encontrado para download.");
            return;
        }

        const link = document.createElement('a');
        link.href = imgElement.src;
        link.setAttribute('download', 'diagrama-arquitetura.png');
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
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
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resultados da Análise</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {isDiagramVisible && (
                         <button
                            onClick={handleDownloadDiagram}
                            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            title="Baixar diagrama como PNG"
                        >
                            <Icon name="diagram" className="w-5 h-5" />
                            <span>Exportar .PNG</span>
                        </button>
                    )}
                    {result.audioBase64 && (
                        <button
                            onClick={handleDownloadAudio}
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            title="Baixar resumo em áudio MP3"
                        >
                            <Icon name="audio" className="w-5 h-5" />
                            <span>Exportar .MP3</span>
                        </button>
                    )}
                    <button
                        onClick={handleDownloadMarkdown}
                        className="inline-flex items-center gap-2 bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        title="Baixar em formato Markdown"
                    >
                        <Icon name="download" className="w-5 h-5" />
                        <span>.MD</span>
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400 transition-colors"
                        title="Baixar em formato PDF"
                    >
                        <Icon name="pdf" className="w-5 h-5" />
                        {isGeneratingPdf ? 'Gerando...' : 'Exportar PDF'}
                    </button>
                </div>
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="flex flex-wrap items-center space-x-2 sm:space-x-4 -mb-px">
                    <TabButton tab="html" label="Página Web" icon="html" />
                    <TabButton tab="markdown" label="Markdown" icon="markdown" />
                </nav>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                {activeTab === 'html' && (
                    <>
                        {showGenerateDiagramButton && (
                            <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow text-center no-print border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Visualização da Arquitetura</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Um diagrama visual pode ser gerado por IA para esta seção.</p>
                                <button
                                    onClick={onGenerateDiagram}
                                    disabled={isGeneratingDiagram}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed"
                                >
                                    <Icon name="diagram" className="w-5 h-5" />
                                    {isGeneratingDiagram ? 'Gerando Diagrama...' : 'Gerar Diagrama com IA'}
                                </button>
                            </div>
                        )}
                        <div dangerouslySetInnerHTML={{ __html: result.html }} />
                    </>
                )}
                {activeTab === 'markdown' && (
                    <div>
                        <pre className="whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                            <code>{result.markdown}</code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
