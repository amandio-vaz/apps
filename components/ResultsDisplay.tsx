import React, { useState, useEffect } from 'react';
import type { AnalysisResult } from '../types';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

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
    isLoading: boolean;
}

type Tab = 'html' | 'markdown';
type DownloadStatus = 'idle' | 'loading' | 'success';

const DownloadButtonContent: React.FC<{
    status: DownloadStatus;
    idleIcon: string;
    idleText: string;
    loadingText?: string;
    successText?: string;
}> = ({ status, idleIcon, idleText, loadingText = 'Gerando...', successText = 'Sucesso!' }) => {
    switch (status) {
        case 'loading':
            return (
                <>
                    <Icon name="spinner" className="w-5 h-5" />
                    <span>{loadingText}</span>
                </>
            );
        case 'success':
            return (
                <>
                    <Icon name="check" className="w-5 h-5" />
                    <span>{successText}</span>
                </>
            );
        case 'idle':
        default:
            return (
                <>
                    <Icon name={idleIcon} className="w-5 h-5" />
                    <span>{idleText}</span>
                </>
            );
    }
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onGenerateDiagram, isLoading }) => {
    const [activeTab, setActiveTab] = useState<Tab>('html');
    const [downloadStatus, setDownloadStatus] = useState<{
        pdf: DownloadStatus;
        markdown: DownloadStatus;
        audio: DownloadStatus;
        diagram: DownloadStatus;
    }>({
        pdf: 'idle',
        markdown: 'idle',
        audio: 'idle',
        diagram: 'idle',
    });

    const [isDiagramVisible, setIsDiagramVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [copyStatusMessage, setCopyStatusMessage] = useState('');
    
    // State for pagination
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const diagramElement = document.getElementById('aiGeneratedDiagram');
        setIsDiagramVisible(!!diagramElement);
    }, [result.html]);

    // Effect for pagination logic
    useEffect(() => {
        if (activeTab === 'html' && result.html) {
            // Split by H1 or H2 tags, keeping the tags with the content that follows them
            const contentPages = result.html.split(/(?=<h[1-2][^>]*>)/).filter(page => page.trim() !== '');
            if (contentPages.length > 1) {
                setPages(contentPages);
            } else {
                // Fallback for content without H1/H2 tags or very short content
                setPages([result.html]);
            }
            setCurrentPage(0);
        }
    }, [result.html, activeTab]);


    const showGenerateDiagramButton = result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]');

    const setStatusWithTimeout = (key: keyof typeof downloadStatus, status: DownloadStatus, timeout = 2000) => {
        setDownloadStatus(s => ({ ...s, [key]: status }));
        if (status === 'success') {
            setTimeout(() => {
                setDownloadStatus(s => ({ ...s, [key]: 'idle' }));
            }, timeout);
        }
    };

    const handleDownloadPdf = async () => {
        const { jsPDF } = window.jspdf;
        
        if (!result.html) {
            alert("Não há conteúdo HTML para gerar o PDF.");
            return;
        }

        setStatusWithTimeout('pdf', 'loading');

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '515pt';
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'prose prose-slate max-w-none';
        contentWrapper.innerHTML = result.html;
        container.appendChild(contentWrapper);
        document.body.appendChild(container);

        try {
            document.body.classList.add('pdf-rendering');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });
            await pdf.html(contentWrapper, {
                margin: [40, 40, 40, 40],
                autoPaging: 'slice',
                html2canvas: {
                    scale: 0.7,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc: Document) => {
                        clonedDoc.documentElement.classList.remove('dark');
                    }
                },
                width: 515,
                windowWidth: 1024,
            });
            pdf.save('analise-arquitetura-ia.pdf');
            setStatusWithTimeout('pdf', 'success');

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
            setStatusWithTimeout('pdf', 'idle', 0);
        } finally {
            document.body.removeChild(container);
            document.body.classList.remove('pdf-rendering');
        }
    };

    const handleDownloadMarkdown = () => {
        if (!result.markdown) {
            alert("Conteúdo Markdown não disponível para download.");
            return;
        }

        setStatusWithTimeout('markdown', 'loading');
        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.md');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusWithTimeout('markdown', 'success');
    };

    const handleDownloadAudio = () => {
        if (!result.audioBase64) {
            alert("Resumo em áudio não disponível para download.");
            return;
        }

        setStatusWithTimeout('audio', 'loading');
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
        setStatusWithTimeout('audio', 'success');
    };
    
    const handleDownloadDiagram = () => {
        const imgElement = document.getElementById('aiGeneratedDiagram') as HTMLImageElement;
        if (!imgElement) {
            alert("Diagrama não encontrado para download.");
            return;
        }

        setStatusWithTimeout('diagram', 'loading');
        const link = document.createElement('a');
        link.href = imgElement.src;
        link.setAttribute('download', 'diagrama-arquitetura.png');
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        setStatusWithTimeout('diagram', 'success');
    };

    const handleCopyMarkdown = () => {
        if (!result.markdown) return;
        navigator.clipboard.writeText(result.markdown).then(() => {
            setIsCopied(true);
            setCopyStatusMessage('Conteúdo copiado para a área de transferência!');
            setTimeout(() => {
                setIsCopied(false);
                setCopyStatusMessage('');
            }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar o texto: ', err);
            setCopyStatusMessage('Falha ao copiar o texto.');
            setTimeout(() => setCopyStatusMessage(''), 2000);
        });
    };
    
    const baseButtonClass = "inline-flex items-center justify-center gap-2 w-44 text-white font-bold py-2 px-4 rounded-lg transition-colors";

    const TabButton: React.FC<{ tab: Tab; label: string; icon: string; tooltip: string }> = ({ tab, label, icon, tooltip }) => (
        <Tooltip text={tooltip}>
            <button
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
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
        </Tooltip>
    );

    const PaginationControls: React.FC = () => {
        if (pages.length <= 1) return null;

        return (
            <div className="flex justify-between items-center my-6 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg no-print">
                <Tooltip text="Ir para a página anterior do documento.">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Anterior
                    </button>
                </Tooltip>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Página {currentPage + 1} de {pages.length}
                </span>
                <Tooltip text="Ir para a próxima página do documento.">
                    <button
                        onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                        disabled={currentPage === pages.length - 1}
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Próximo
                    </button>
                </Tooltip>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resultados da Análise</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {isDiagramVisible && (
                        <Tooltip text="Baixar o diagrama de arquitetura gerado pela IA como uma imagem PNG.">
                            <button
                                onClick={handleDownloadDiagram}
                                disabled={downloadStatus.diagram !== 'idle'}
                                className={`${baseButtonClass} ${
                                    downloadStatus.diagram === 'success' ? 'bg-green-600' : 'bg-teal-600 hover:bg-teal-700'
                                } disabled:bg-slate-400 ${downloadStatus.diagram === 'loading' ? 'cursor-wait' : ''}`}
                                aria-label="Baixar diagrama como imagem PNG"
                            >
                                <DownloadButtonContent status={downloadStatus.diagram} idleIcon="diagram" idleText="Exportar .PNG" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    {result.audioBase64 && (
                        <Tooltip text="Baixar o resumo executivo em formato de áudio MP3.">
                            <button
                                onClick={handleDownloadAudio}
                                disabled={downloadStatus.audio !== 'idle'}
                                className={`${baseButtonClass} ${
                                    downloadStatus.audio === 'success' ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'
                                } disabled:bg-slate-400 ${downloadStatus.audio === 'loading' ? 'cursor-wait' : ''}`}
                                aria-label="Baixar resumo em áudio no formato MP3"
                            >
                                <DownloadButtonContent status={downloadStatus.audio} idleIcon="audio" idleText="Exportar .MP3" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip text="Baixar o relatório completo da análise no formato Markdown.">
                        <button
                            onClick={handleDownloadMarkdown}
                            disabled={downloadStatus.markdown !== 'idle'}
                            className={`${baseButtonClass} ${
                                downloadStatus.markdown === 'success' ? 'bg-green-600' : 'bg-slate-500 hover:bg-slate-600'
                            } disabled:bg-slate-400 ${downloadStatus.markdown === 'loading' ? 'cursor-wait' : ''}`}
                            aria-label="Baixar análise em formato Markdown"
                        >
                             <DownloadButtonContent status={downloadStatus.markdown} idleIcon="download" idleText="Exportar .MD" loadingText="Baixando..." />
                        </button>
                    </Tooltip>
                    <Tooltip text="Gerar e baixar um relatório completo e profissional no formato PDF.">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadStatus.pdf !== 'idle'}
                            className={`${baseButtonClass} ${
                                downloadStatus.pdf === 'success' ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'
                            } disabled:bg-slate-400 ${downloadStatus.pdf === 'loading' ? 'cursor-wait' : ''}`}
                            aria-label="Exportar análise para formato PDF"
                        >
                            <DownloadButtonContent status={downloadStatus.pdf} idleIcon="pdf" idleText="Exportar PDF" />
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav role="tablist" aria-label="Formatos de resultado" className="flex flex-wrap items-center space-x-2 sm:space-x-4 -mb-px">
                    <TabButton tab="html" label="Página Web" icon="html" tooltip="Visualizar o relatório como uma página web interativa." />
                    <div className="flex items-center gap-2">
                        <TabButton tab="markdown" label="Markdown" icon="markdown" tooltip="Visualizar o relatório em formato Markdown puro." />
                        {activeTab === 'markdown' && (
                            <Tooltip text="Copiar todo o conteúdo Markdown para a área de transferência.">
                                <button
                                    onClick={handleCopyMarkdown}
                                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                                    aria-label="Copiar conteúdo Markdown para a área de transferência"
                                >
                                    {isCopied ? (
                                        <>
                                            <Icon name="check" className="w-4 h-4 text-green-500" />
                                            <span>Copiado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="copy" className="w-4 h-4" />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </nav>
            </div>

            {/* Live region for screen reader announcements */}
            <div role="status" aria-live="polite" className="sr-only">
              {copyStatusMessage}
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <div 
                    id="tabpanel-html"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="tab-html"
                    hidden={activeTab !== 'html'}
                >
                    {showGenerateDiagramButton && (
                        <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow text-center no-print border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Visualização da Arquitetura</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Um diagrama visual pode ser gerado por IA para esta seção.</p>
                            <Tooltip text="Solicitar à IA que gere um diagrama visual da arquitetura com base na análise.">
                                <button
                                    onClick={onGenerateDiagram}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed"
                                >
                                    <Icon name="diagram" className="w-5 h-5" />
                                    Gerar Diagrama com IA
                                </button>
                            </Tooltip>
                        </div>
                    )}
                    <PaginationControls />
                    <div dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }} />
                    <PaginationControls />
                </div>
                <div
                    id="tabpanel-markdown"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="tab-markdown"
                    hidden={activeTab !== 'markdown'}
                >
                    <pre className="whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                        <code>{result.markdown}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};