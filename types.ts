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

export interface DiagramConfig {
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages: number;
}
