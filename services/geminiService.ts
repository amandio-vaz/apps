import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UploadedFile, GeminiAnalysisResponse, DiagramConfig } from '../types';
import { audioCache } from './audioCacheService';
import { diagramCache } from './diagramCacheService';


if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const mainPrompt = `
Você é um sistema de IA especialista em análise e otimização de arquiteturas tecnológicas. Sua tarefa é realizar uma análise comparativa detalhada com base nos documentos fornecidos e gerar uma documentação profissional aprimorada. Você DEVE seguir rigorosamente a estrutura e os requisitos de qualidade abaixo. A resposta deve ser EXCLUSIVAMENTE em português do Brasil (pt-BR).

**ESTRUTURA E ESTILO DO DOCUMENTO FINAL (GERAR EM HTML e MARKDOWN):**

O documento HTML deve ser bem estruturado e visualmente agradável. Use as seguintes classes de Tailwind CSS para formatar as seções principais como "cards" distintos para melhorar a legibilidade:

-   Para cada seção principal (Resumo, Análise Original, Arquiteturas Propostas, etc.), use um wrapper: \`<div class="p-6 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl mb-8 border border-slate-200/50 dark:border-slate-700/50 shadow-md pdf-no-break">\`.
-   Use títulos \`<h2>\` e \`<h3>\` de forma consistente para a hierarquia.
-   Tabelas devem ter a classe \`w-full text-left border-collapse\`. Use \`<th class="p-2 border-b-2 border-slate-300 dark:border-slate-600 bg-slate-200/50 dark:bg-slate-700/50 font-semibold">\` e \`<td class="p-2 border-b border-slate-200 dark:border-slate-700">\`.
-   Blocos de código (especialmente para Mermaid) devem estar em \`<pre class="bg-slate-900 text-white p-4 rounded-md overflow-x-auto"><code>...\</code></pre>\`.

**CONTEÚDO DAS SEÇÕES:**

1.  **RESUMO EXECUTIVO**: Visão geral da análise, principais descobertas, recomendação principal.
2.  **ANÁLISE DA ARQUITETURA ORIGINAL**: Descrição detalhada, stack de tecnologia, diagrama/fluxograma (se possível extrair), Pontos Fortes (✅), Limitações e Desvantagens (⚠️).
3.  **ARQUITETURAS PROPOSTAS (2 a 4 opções)**: Para cada proposta:
    *   **3.X.1. Visão Geral**: Nome descritivo, objetivo.
    *   **3.X.2. Diagrama Arquitetural**: Gere um diagrama em sintaxe Mermaid dentro de um bloco de código.
    *   **3.X.3. Stack de Tecnologia**: Tecnologias, versões, justificativa.
    *   **3.X.4. Análise Comparativa**: Tabela (Performance, Escalabilidade, Custo, Manutenibilidade, Segurança).
    *   **3.X.5. Vantagens**: Lista detalhada de benefícios.
    *   **3.X.6. Desvantagens e Trade-offs**: Pontos de atenção.
    *   **3.X.7. Roteiro de Implementação**: Fases, priorização.
4.  **MATRIZ DE DECISÃO**: Comparativo geral entre as opções com pontuação.
5.  **CONSIDERAÇÕES TÉCNICAS FINAIS**: Opinião embasada, recomendações, alertas.
6.  **GLOSSÁRIO TÉCNICO**: Termos e conceitos utilizados.
7.  **REFERÊNCIAS E RECURSOS**: Links para documentações, artigos, etc.

**REQUISITOS DE QUALIDADE (OBRIGATÓRIO):**
*   **Técnico**: Informações validadas e recentes (máximo 6 meses), precisão técnica, exemplos práticos.
*   **Estético**: Design profissional, diagramas elegantes (use Mermaid), hierarquia visual clara.
*   **Didático**: Explicações completas, progressão lógica, linguagem técnica acessível.
*   **Linguístico**: EXCLUSIVAMENTE em português do Brasil (pt-BR), terminologia padroniizada, gramática impecável.

**REGRAS IMPERATIVAS:**
1.  **ZERO SUPERFICIALIDADE**: Análises profundas e embasadas.
2.  **VALIDAÇÃO CRUZADA**: Confirme informações técnicas em múltiplas fontes.
3.  **ATUALIDADE**: Priorize tecnologias e práticas dos últimos 12 meses.
4.  **NEUTRALIDADE**: Apresente prós e contras honestamente.
5.  **EXECUTABILIDADE**: Propostas devem ser implementáveis.
6.  **RASTREABILIDADE**: Toda afirmação técnica deve ter fonte/referência.

**ENTRADA DO USUÁRIO:**
*   **Contexto/Domínio**: {context}
*   **Restrições Conhecidas**: {constraints}
*   **Prioridades**: {priorities}

**PLACEHOLDERS (IMPORTANTE):**
*   **ÁUDIO**: No documento HTML, insira a string '[[AUDIO_PLAYER_PLACEHOLDER]]' EXATAMENTE APÓS a seção "RESUMO EXECUTIVO".
*   **IMAGEM**: No documento HTML, insira a string '[[DIAGRAM_PLACEHOLDER]]' onde um diagrama visual gerado por IA deve ser colocado (sugestão: dentro de uma das seções de arquitetura proposta).

**INSTRUÇÕES DE SAÍDA:**
Sua resposta final DEVE ser um objeto JSON válido, sem nenhum texto ou formatação adicional fora do JSON. Siga o schema fornecido.
`;

export const analyzeArchitecture = async (
    files: UploadedFile[], 
    context: string, 
    constraints: string, 
    priorities: string
): Promise<GeminiAnalysisResponse> => {
    
    const fileParts = files.map(file => ({
        inlineData: {
            mimeType: file.mimeType,
            data: file.base64,
        },
    }));

    const populatedPrompt = mainPrompt
        .replace('{context}', context || 'Não especificado')
        .replace('{constraints}', constraints || 'Não especificado')
        .replace('{priorities}', priorities || 'Não especificado');

    const contents = {
        parts: [
            ...fileParts,
            { text: "Documentos para análise anexados acima." },
            { text: populatedPrompt },
        ],
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    html: { type: Type.STRING, description: 'O relatório completo em formato HTML.' },
                    markdown: { type: Type.STRING, description: 'O relatório completo em formato Markdown.' },
                    audioSummary: { type: Type.STRING, description: 'Um resumo executivo conciso (2-3 parágrafos) para ser usado na geração de áudio TTS.' },
                    diagramPrompt: { type: Type.STRING, description: 'Um prompt de texto em inglês, detalhado e descritivo, para gerar uma imagem de diagrama de arquitetura elegante e profissional com o modelo Imagen. Exemplo: "An elegant and professional architecture diagram showing a serverless microservices setup on a cloud platform, with data flowing from a user through an API gateway to lambda functions and databases. Use a dark theme with neon blue and purple highlights."' }
                },
                required: ['html', 'markdown', 'audioSummary', 'diagramPrompt']
            },
            thinkingConfig: { thinkingBudget: 32768 }
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as GeminiAnalysisResponse;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", jsonText);
        throw new Error("A resposta da IA não estava em um formato JSON válido.");
    }
};

// --- Funções Auxiliares para Geração de Áudio ---

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

function splitTextIntoChunks(text: string, limit: number): string[] {
    if (text.length <= limit) {
        return [text];
    }
    // Divide o texto em sentenças para tentar manter a coesão.
    const sentences = text.match(/.*?(?:[.!?…](?=\s|$)|\n|$)/g)?.filter(s => s.trim().length > 0) || [text];
    
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        // Se uma única sentença já ultrapassa o limite, ela será dividida à força.
        if (sentence.length > limit) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            for (let i = 0; i < sentence.length; i += limit) {
                chunks.push(sentence.substring(i, i + limit));
            }
        } else if ((currentChunk + sentence).length > limit) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
}

const _generateSingleAudioChunk = async (
    textChunk: string,
    voice: string,
    narrationStyle: string
): Promise<string> => {
    const styleInstructions: { [key: string]: string } = {
        'Profissional e Claro': 'de forma clara, profissional e com uma voz natural',
        'Entusiasmado e Dinâmico': 'com entusiasmo, de forma dinâmica e com uma voz energética',
        'Calmo e Ponderado': 'de forma calma, ponderada e com uma voz suave',
        'Formal e Conciso': 'de forma formal, concisa e com uma voz direta',
        'Narrativa Cativante': 'como se estivesse contando uma história cativante, com uma voz envolvente e expressiva',
    };
    const instruction = styleInstructions[narrationStyle] || styleInstructions['Profissional e Claro'];
    const prompt = `Leia o seguinte texto ${instruction}: "${textChunk}"`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (audioPart && audioPart.inlineData) {
        return audioPart.inlineData.data;
    }
    throw new Error(`Não foi possível gerar o áudio para o trecho: "${textChunk.substring(0, 50)}..."`);
};

export const generateAudioSummary = async (
    summaryText: string,
    voice: string,
    narrationStyle: string
): Promise<string> => {
    const cachedAudio = audioCache.get(summaryText, voice, narrationStyle);
    if (cachedAudio) {
        console.log("Retornando resumo de áudio do cache persistente.");
        return cachedAudio;
    }

    console.log("Gerando novo resumo de áudio (não encontrado no cache).");
    const TTS_CHARACTER_LIMIT = 4000; // Limite de segurança para caracteres por chamada TTS

    if (summaryText.length <= TTS_CHARACTER_LIMIT) {
        const audioBase64 = await _generateSingleAudioChunk(summaryText, voice, narrationStyle);
        audioCache.set(summaryText, voice, narrationStyle, audioBase64);
        return audioBase64;
    }

    // Lógica para textos longos
    console.log(`Texto longo detectado (${summaryText.length} caracteres). Dividindo em partes para geração de áudio.`);
    const textChunks = splitTextIntoChunks(summaryText, TTS_CHARACTER_LIMIT);
    console.log(`Texto dividido em ${textChunks.length} partes.`);

    // Gera o áudio para todas as partes em paralelo para otimizar o tempo
    const audioChunkPromises = textChunks.map(chunk => _generateSingleAudioChunk(chunk, voice, narrationStyle));
    const base64AudioChunks = await Promise.all(audioChunkPromises);

    console.log("Concatenando partes de áudio...");
    const decodedAudioChunks = base64AudioChunks.map(decodeBase64);
    const concatenatedAudioData = concatenateUint8Arrays(decodedAudioChunks);
    const finalAudioBase64 = encodeBase64(concatenatedAudioData);
    
    console.log("Áudio final concatenado com sucesso.");
    
    // Salva o áudio completo e concatenado no cache
    audioCache.set(summaryText, voice, narrationStyle, finalAudioBase64);
    return finalAudioBase64;
};

export const generateDiagramImage = async (prompt: string, config: DiagramConfig): Promise<string[]> => {
    const cachedImages = diagramCache.get(prompt, config.aspectRatio, config.numberOfImages, config.style, config.negativePrompt);
    if (cachedImages) {
        console.log("Retornando imagens de diagrama do cache persistente.");
        return cachedImages;
    }

    console.log(`Gerando ${config.numberOfImages} novas imagens de diagrama com 'imagen-4.0-generate-001', proporção ${config.aspectRatio}, estilo ${config.style}.`);
    
    const stylePromptEnhancements: { [key: string]: string } = {
        'Arquitetura de Blocos': ', visualized as a detailed technical block architecture diagram. Use industry-standard notation, clearly defined components with precise layout, minimalist icons, and logical connections with clear annotations. Highly detailed, professional-grade technical illustration.',
        'Fluxo de Dados': ', visualized as a detailed technical data flow diagram (DFD) using industry-standard notation. Show connections, pathways, and data sources with precise layout, clear annotations, and directional arrows. Professional-grade technical illustration with high clarity.',
        'Componentes Detalhados': ', as a detailed technical diagram focusing on system components. Similar to a system decomposition diagram, it should have a precise layout with clear annotations for each part. Highly detailed and precise technical drawing style.',
        'Diagrama de Sequência': ', as a UML sequence diagram illustrating interactions between lifelines over time. Use industry-standard UML notation with precise layout and clear annotations on messages. Professional, clear, and highly detailed technical illustration.',
        'Visão Isométrica 3D': ', in a 3D isometric style, with a sense of depth and perspective. This should be a detailed technical illustration with a precise layout and clear annotations where applicable, presented in a sleek and modern style. High-quality, professional-grade render.',
        'Estilo Blueprint Técnico': ', in the style of a detailed technical CAD blueprint drawing. Featuring clean, precise vector lines, grid lines, industry-standard notation, and clear technical annotations. A monochromatic blue color scheme on a dark background is preferred. Highly detailed and professional.',
    };

    // Adiciona o aprimoramento de estilo ao prompt, se houver um correspondente
    const enhancement = stylePromptEnhancements[config.style] || '';
    const enhancedPrompt = `${prompt}${enhancement}`;

    // Constrói o objeto de configuração para a API do Imagen
    const apiConfig: {
        numberOfImages: number;
        outputMimeType: 'image/png';
        aspectRatio: DiagramConfig['aspectRatio'];
        negativePrompt?: string;
    } = {
        numberOfImages: config.numberOfImages,
        outputMimeType: 'image/png',
        aspectRatio: config.aspectRatio,
    };
    
    // Adiciona o prompt negativo à configuração, se ele for fornecido e não estiver vazio
    if (config.negativePrompt && config.negativePrompt.trim()) {
        apiConfig.negativePrompt = config.negativePrompt.trim();
        console.log(`Usando prompt negativo: "${apiConfig.negativePrompt}"`);
    }

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: enhancedPrompt, // Usa o prompt aprimorado
            config: apiConfig, // Usa o objeto de configuração construído
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const imagesBase64 = response.generatedImages.map(img => img.image.imageBytes);
            console.log(`Sucesso! ${imagesBase64.length} de ${config.numberOfImages} imagens geradas.`);
            diagramCache.set(prompt, config.aspectRatio, config.numberOfImages, config.style, imagesBase64, config.negativePrompt);
            return imagesBase64;
        } else {
             throw new Error("A API não retornou imagens geradas.");
        }
    } catch (err) {
        console.error("Erro ao gerar imagens de diagrama com Imagen:", err);
        let userFriendlyMessage = "Não foi possível gerar a imagem do diagrama. A API retornou um erro inesperado.";
        if (err instanceof Error) {
            if (err.message.toLowerCase().includes('safety policy')) {
                userFriendlyMessage = "O prompt foi bloqueado pela política de segurança. Tente reformular o prompt, especialmente o prompt negativo.";
            } else if (err.message.toLowerCase().includes('invalid argument')) {
                userFriendlyMessage = "Houve um problema com os parâmetros enviados. Verifique as configurações e tente novamente.";
            } else if (err.message.toLowerCase().includes('quota')) {
                 userFriendlyMessage = "O limite de solicitações para a API foi atingido. Por favor, tente novamente mais tarde.";
            }
        }
        // Lança um novo erro com uma mensagem mais específica para a UI.
        throw new Error(userFriendlyMessage);
    }
};
