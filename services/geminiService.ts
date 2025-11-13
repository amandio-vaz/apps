
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UploadedFile, GeminiAnalysisResponse } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const mainPrompt = `
Você é um sistema de IA especialista em análise e otimização de arquiteturas tecnológicas. Sua tarefa é realizar uma análise comparativa detalhada com base nos documentos fornecidos e gerar uma documentação profissional aprimorada. Você DEVE seguir rigorosamente a estrutura e os requisitos de qualidade abaixo. A resposta deve ser EXCLUSIVAMENTE em português do Brasil (pt-BR).

**ESTRUTURA DO DOCUMENTO FINAL (GERAR EM HTML e MARKDOWN):**

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
*   **Linguístico**: EXCLUSIVAMENTE em português do Brasil (pt-BR), terminologia padronizada, gramática impecável.

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

export const generateAudioSummary = async (
    summaryText: string,
    voice: string,
    narrationStyle: string
): Promise<string> => {
    const styleInstructions: { [key: string]: string } = {
        'Profissional e Claro': 'de forma clara, profissional e com uma voz natural',
        'Entusiasmado e Dinâmico': 'com entusiasmo, de forma dinâmica e com uma voz energética',
        'Calmo e Ponderado': 'de forma calma, ponderada e com uma voz suave',
    };

    const instruction = styleInstructions[narrationStyle] || styleInstructions['Profissional e Claro'];
    const prompt = `Leia o seguinte resumo ${instruction}: "${summaryText}"`;
    
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
    throw new Error("Não foi possível gerar o áudio.");
};


export const generateDiagramImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    const image = response.generatedImages?.[0]?.image?.imageBytes;
    if (image) {
        return image;
    }
    throw new Error("Não foi possível gerar a imagem do diagrama.");
};
