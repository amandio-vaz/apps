import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalysisResult } from '../types';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

// Fix: Add type declarations for jspdf and html2canvas to the global window object.
// These libraries are loaded dynamically, so TypeScript needs to be aware of them.
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

const loadedScripts = new Map<string, Promise<void>>();

const loadScript = (src: string): Promise<void> => {
    if (loadedScripts.has(src)) {
        return loadedScripts.get(src)!;
    }
    const promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
    loadedScripts.set(src, promise);
    return promise;
};


interface ResultsDisplayProps {
    result: AnalysisResult;
    onGenerateDiagram: () => Promise<string | null>;
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
                    <Icon name="spinner" className="w-5 h-5 animate-spin" />
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

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onGenerateDiagram }) => {
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
    const [isMounted, setIsMounted] = useState(false);

    // State for Diagram Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState('');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const startPanPoint = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);


    const setStatusWithTimeout = useCallback((key: keyof typeof downloadStatus, status: DownloadStatus, timeout = 2000) => {
        setDownloadStatus(s => ({ ...s, [key]: status }));
        if (status === 'success') {
            setTimeout(() => {
                setDownloadStatus(s => ({ ...s, [key]: 'idle' }));
            }, timeout);
        }
    }, []);

    useEffect(() => {
        // Trigger animation shortly after the component mounts
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Automatically generate the diagram if a prompt is available
    useEffect(() => {
        if (result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]')) {
            const autoGenerate = async () => {
                setStatusWithTimeout('diagram', 'loading', 0);
                const imageBase64 = await onGenerateDiagram();
                if (imageBase64) {
                    setStatusWithTimeout('diagram', 'success', 2000);
                } else {
                    setStatusWithTimeout('diagram', 'idle', 0);
                }
            };
            autoGenerate();
        }
    }, [result.diagramPrompt, onGenerateDiagram, setStatusWithTimeout, result.html]);

    useEffect(() => {
        const diagramElement = document.getElementById('aiGeneratedDiagram');
        setIsDiagramVisible(!!diagramElement);
    }, [result.html]);

    // Effect for pagination logic
    useEffect(() => {
        if (activeTab === 'html' && result.html) {
            const rawPages = result.html.split(/(?=<h[1-2][^>]*>)/).filter(page => page.trim() !== '');
            const mergedPages: string[] = [];
            let pageBuffer = '';
    
            rawPages.forEach((page, index) => {
                pageBuffer += page;
                const hasContentAfterHeading = /<\/h[1-2]>\s*<[a-z]/i.test(page);
    
                if (hasContentAfterHeading || index === rawPages.length - 1) {
                    if (pageBuffer.trim()) {
                        mergedPages.push(pageBuffer);
                    }
                    pageBuffer = '';
                }
            });
    
            if (pageBuffer.trim()) mergedPages.push(pageBuffer);
    
            setPages(mergedPages.length > 0 ? mergedPages : (result.html ? [result.html] : []));
            setCurrentPage(0);
        }
    }, [result.html, activeTab]);

    const showGenerateDiagramButton = result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]');
    const showDiagramGenerationUI = showGenerateDiagramButton || downloadStatus.diagram !== 'idle';


    const handleGenerateDiagramClick = async () => {
        if (!showGenerateDiagramButton || downloadStatus.diagram === 'loading') return;
        setStatusWithTimeout('diagram', 'loading', 0);
        const imageBase64 = await onGenerateDiagram();
        if (imageBase64) {
            triggerPngDownload(imageBase64, 'diagrama-arquitetura-ia.png');
            setStatusWithTimeout('diagram', 'success', 2000);
        } else {
            setStatusWithTimeout('diagram', 'idle', 0);
        }
    };

    const triggerPngDownload = (base64Data: string, filename: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64Data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPdf = async () => {
        setStatusWithTimeout('pdf', 'loading', 0);
        try {
            await Promise.all([
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js")
            ]);

            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
                throw new Error("PDF generation libraries not loaded correctly.");
            }
            
            const { jsPDF } = window.jspdf;
            const style = document.createElement('style');
            style.id = 'pdf-print-styles';
            // Refined CSS page-break logic
            style.innerHTML = `
                .pdf-export-container h1, .pdf-export-container h2 { page-break-before: always; }
                .pdf-export-container h1 + h2 { page-break-before: auto; } /* Don't break between h1 and immediate h2 */
                .pdf-export-container > .prose > h1:first-child, .pdf-export-container > .prose > h2:first-child { page-break-before: auto; }
                .pdf-export-container h1, .pdf-export-container h2, .pdf-export-container h3, .pdf-export-container h4, .pdf-export-container figure, .pdf-export-container table, .pdf-export-container pre, .pdf-export-container blockquote, .pdf-export-container .pdf-no-break, .pdf-export-container ul, .pdf-export-container ol { page-break-inside: avoid; }
            `;
            document.head.appendChild(style);

            const container = document.createElement('div');
            container.className = 'pdf-export-container';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '515pt';
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'prose prose-slate max-w-none';
            contentWrapper.innerHTML = result.html;
            container.appendChild(contentWrapper);
            document.body.appendChild(container);

            document.body.classList.add('pdf-rendering');
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            await pdf.html(contentWrapper, {
                margin: [40, 40, 40, 40],
                autoPaging: 'slice',
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', onclone: (doc: Document) => doc.documentElement.classList.remove('dark') },
                width: 515,
                windowWidth: 1024,
            });
            pdf.save('analise-arquitetura-ia.pdf');
            setStatusWithTimeout('pdf', 'success');

            document.body.removeChild(container);
            document.body.classList.remove('pdf-rendering');
            style.remove();

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
            setStatusWithTimeout('pdf', 'idle', 0);
        }
    };

    const handleDownloadMarkdown = () => {
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
        if (!result.audioBase64) return;
        setStatusWithTimeout('audio', 'loading');
        const binaryString = window.atob(result.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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
        if (!imgElement) return;
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
        navigator.clipboard.writeText(result.markdown).then(() => {
            setIsCopied(true);
            setCopyStatusMessage('Conteúdo copiado!');
            setTimeout(() => { setIsCopied(false); setCopyStatusMessage(''); }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar:', err);
            setCopyStatusMessage('Falha ao copiar.');
            setTimeout(() => setCopyStatusMessage(''), 2000);
        });
    };

    // Diagram Modal Handlers
    const openModal = (src: string) => {
        setModalImageSrc(src);
        setIsModalOpen(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };
    const closeModal = () => setIsModalOpen(false);
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        setZoom(Math.max(0.5, Math.min(newZoom, 5)));
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsPanning(true);
        startPanPoint.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setPan({
            x: e.clientX - startPanPoint.current.x,
            y: e.clientY - startPanPoint.current.y,
        });
    };
    const handleMouseUp = () => setIsPanning(false);

    // Event delegation for opening the modal
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.id === 'aiGeneratedDiagram' && target.tagName === 'IMG') {
            openModal(target.getAttribute('src') || '');
        }
    };
    
    const baseButtonClass = "inline-flex items-center justify-center gap-2 w-full sm:w-auto text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-60";

    const TabButton: React.FC<{ tab: Tab; label: string; icon: string; tooltip: string }> = ({ tab, label, icon, tooltip }) => (
        <Tooltip text={tooltip}>
            <button
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-md transition-all duration-300 transform hover:scale-110 ${
                    activeTab === tab 
                    ? 'text-sky-400' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400'
                }`}
            >
                <Icon name={icon} className="w-5 h-5" />
                <span>{label}</span>
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-400 rounded-full" />}
            </button>
        </Tooltip>
    );

    const PaginationControls: React.FC = () => {
        if (pages.length <= 1) return null;

        return (
            <div className="flex justify-between items-center my-6 p-3 bg-white/10 dark:bg-slate-900/50 rounded-lg no-print">
                <Tooltip text="Ir para a página anterior do documento.">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-700/50 hover:bg-white/30 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
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
                        className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-700/50 hover:bg-white/30 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        Próximo
                    </button>
                </Tooltip>
            </div>
        );
    };

    return (
        <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200/20 dark:border-slate-700/50">
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 transition-all duration-500 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Resultados da Análise</h2>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
                    {isDiagramVisible && (
                        <Tooltip text="Baixar o diagrama de arquitetura gerado pela IA como uma imagem PNG.">
                            <button
                                onClick={handleDownloadDiagram}
                                disabled={downloadStatus.diagram !== 'idle'}
                                className={`${baseButtonClass} bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600`}
                                aria-label="Baixar diagrama como imagem PNG"
                            >
                                <DownloadButtonContent status={downloadStatus.diagram} idleIcon="diagram" idleText=".PNG" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    {result.audioBase64 && (
                        <Tooltip text="Baixar o resumo executivo em formato de áudio MP3.">
                            <button
                                onClick={handleDownloadAudio}
                                disabled={downloadStatus.audio !== 'idle'}
                                className={`${baseButtonClass} bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600`}
                                aria-label="Baixar resumo em áudio no formato MP3"
                            >
                                <DownloadButtonContent status={downloadStatus.audio} idleIcon="audio" idleText=".MP3" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip text="Baixar o relatório completo da análise no formato Markdown.">
                        <button
                            onClick={handleDownloadMarkdown}
                            disabled={downloadStatus.markdown !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600`}
                            aria-label="Baixar análise em formato Markdown"
                        >
                             <DownloadButtonContent status={downloadStatus.markdown} idleIcon="download" idleText=".MD" loadingText="Baixando..." />
                        </button>
                    </Tooltip>
                    <Tooltip text="Gerar e baixar um relatório completo e profissional no formato PDF.">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadStatus.pdf !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600`}
                            aria-label="Exportar análise para formato PDF"
                        >
                            <DownloadButtonContent status={downloadStatus.pdf} idleIcon="pdf" idleText="PDF" />
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            <div className={`border-b border-slate-200/20 dark:border-slate-700/50 mb-6 transition-all duration-500 ease-out delay-150 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <nav role="tablist" aria-label="Formatos de resultado" className="flex flex-wrap items-center space-x-2 sm:space-x-4">
                    <TabButton tab="html" label="Página Web" icon="html" tooltip="Visualizar o relatório como uma página web interativa." />
                    <div className="flex items-center gap-2">
                        <TabButton tab="markdown" label="Markdown" icon="markdown" tooltip="Visualizar o relatório em formato Markdown puro." />
                        {activeTab === 'markdown' && (
                            <Tooltip text="Copiar todo o conteúdo Markdown para a área de transferência.">
                                <button
                                    onClick={handleCopyMarkdown}
                                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-all bg-slate-200/20 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-300/30 dark:hover:bg-slate-600/60 transform hover:scale-105"
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

            <div role="status" aria-live="polite" className="sr-only">
              {copyStatusMessage}
            </div>

            <div className={`prose prose-slate dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white transition-opacity duration-700 ease-out delay-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
                <div 
                    id="tabpanel-html"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="tab-html"
                    hidden={activeTab !== 'html'}
                    onClick={handleContentClick}
                >
                     {showDiagramGenerationUI && (
                        <div className="my-6 p-4 bg-slate-500/10 dark:bg-slate-900/50 rounded-lg shadow text-center no-print border border-slate-200/20 dark:border-slate-700/50 transition-opacity duration-300">
                            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Visualização da Arquitetura</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Um diagrama visual pode ser gerado por IA para esta seção.</p>
                            <Tooltip text="Solicitar à IA que gere e baixe um diagrama visual da arquitetura.">
                                <button
                                    onClick={handleGenerateDiagramClick}
                                    disabled={downloadStatus.diagram === 'loading' || !showGenerateDiagramButton}
                                    className={`inline-flex items-center justify-center gap-2 w-56 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed
                                        ${downloadStatus.diagram === 'success' ? 'bg-green-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}
                                        ${downloadStatus.diagram === 'loading' ? 'bg-slate-500 cursor-wait' : ''}
                                        ${downloadStatus.diagram === 'idle' && !showGenerateDiagramButton ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
                                    `}
                                >
                                   <DownloadButtonContent 
                                        status={downloadStatus.diagram}
                                        idleIcon="diagram"
                                        idleText="Gerar Diagrama com IA"
                                        loadingText="Gerando Diagrama..."
                                        successText="Diagrama Gerado!"
                                   />
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
                    <pre className="whitespace-pre-wrap bg-slate-500/10 dark:bg-slate-900/50 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                        <code>{result.markdown}</code>
                    </pre>
                </div>
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
                    onClick={closeModal}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <Tooltip text="Fechar">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <Icon name="close" className="w-8 h-8"/>
                        </button>
                    </Tooltip>
                    <div 
                        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden cursor-grab"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            ref={imageRef}
                            src={modalImageSrc} 
                            alt="Diagrama de arquitetura ampliado" 
                            className="transition-transform duration-200 ease-out"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
