export interface UploadedFile {
    name: string;
    mimeType: string;
    base64: string;
}

export interface AnalysisResult {
    html: string;
    markdown: string;
    audioBase64: string | null;
    diagramPrompt: string | null;
}

export interface GeminiAnalysisResponse {
    html: string;
    markdown: string;
    audioSummary: string;
    diagramPrompt: string;
}

export interface HistoryEntry {
    id: number;
    date: string;
    files: string[];
    summary: string;
    result: AnalysisResult;
}