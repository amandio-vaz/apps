import React, { useCallback, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface FileUploadProps {
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.json', '.html', '.yaml', '.yml', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragError, setDragError] = useState<string | null>(null);

    const handleFilesValidation = useCallback((incomingFiles: FileList | null) => {
        if (!incomingFiles) return;

        setUploadError(null);
        const filesArray = Array.from(incomingFiles);
        const validationErrors: string[] = [];
        let acceptedFiles: File[] = [];

        for (const file of filesArray) {
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                validationErrors.push(`Tipo de arquivo inválido: ${file.name}`);
            } else if (file.size > MAX_FILE_SIZE) {
                validationErrors.push(`Arquivo muito grande: ${file.name} (limite de 10MB)`);
            } else {
                acceptedFiles.push(file);
            }
        }
        
        if (validationErrors.length > 0) {
            setUploadError(validationErrors.join('. '));
        }

        if (acceptedFiles.length > 0) {
            setFiles(prevFiles => {
                const existingFileNames = new Set(prevFiles.map(f => f.name));
                const newUniqueFiles = acceptedFiles.filter(f => !existingFileNames.has(f.name));
                return [...prevFiles, ...newUniqueFiles];
            });
        }

    }, [setFiles]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFilesValidation(event.target.files);
        if(event.target) event.target.value = '';
    };

    const handleDragEnter = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
            setIsDragging(true);
            // Fix: Explicitly type the `item` in the `.some()` callback to `DataTransferItem`.
            // This resolves the TypeScript error where `item` was being inferred as `unknown`,
            // which prevented access to the `kind` property.
            const hasNonFile = Array.from(event.dataTransfer.items).some((item: DataTransferItem) => item.kind !== 'file');
            if (hasNonFile) {
                setDragError("Pastas não são suportadas. Arraste apenas arquivos.");
            } else {
                setDragError(null);
            }
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

     const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const relatedTarget = event.relatedTarget as Node;
        if (!event.currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
            setDragError(null);
        }
    }, []);
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        setDragError(null);
        if (!dragError) {
            handleFilesValidation(event.dataTransfer.files);
        }
    }, [handleFilesValidation, dragError]);

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const triggerFileSelect = (event: React.MouseEvent) => {
        event.preventDefault();
        fileInputRef.current?.click();
    };
    
    const baseDropzoneClasses = "flex flex-col items-center justify-center w-full h-40 px-4 transition-all duration-300 bg-white/10 dark:bg-slate-900/50 border-2 border-dashed rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2";
    
    const getDropzoneState = () => {
        if (isDragging) {
            if (dragError) {
                return {
                    classes: "border-red-500 ring-2 ring-red-500/50 bg-red-500/10",
                    content: (
                        <span className="flex items-center space-x-3 text-red-500 dark:text-red-400">
                            <Icon name="error" className="w-8 h-8" />
                            <span className="font-medium">{dragError}</span>
                        </span>
                    )
                };
            }
            return {
                classes: "border-sky-500 ring-2 ring-sky-500/50 bg-sky-500/10",
                content: (
                    <span className="flex items-center space-x-3 text-sky-600 dark:text-sky-400">
                        <Icon name="upload" className="w-8 h-8" />
                        <span className="font-medium">Pode soltar para anexar!</span>
                    </span>
                )
            };
        }
        return {
            classes: "border-slate-300/50 dark:border-slate-600/50 hover:border-sky-400 dark:hover:border-sky-500 focus:ring-sky-500",
            content: (
                <>
                    <span className="flex items-center space-x-3">
                        <Icon name="upload" className="w-8 h-8 text-slate-500 dark:text-sky-400" />
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                            Arraste e solte ou{' '}
                            <span className="text-blue-600 dark:text-sky-400 hover:underline" onClick={triggerFileSelect}>
                                clique para selecionar
                            </span>
                        </span>
                    </span>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, MD, TXT, JSON, YAML, PNG, JPG (Max 10MB)</p>
                </>
            )
        };
    };

    const { classes: stateClasses, content: dropzoneContent } = getDropzoneState();

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">1. Anexar Documentos</h2>
            <Tooltip text="Formatos aceitos: .pdf, .md, .docx, .txt, .json, .yaml, .png, .jpg. Limite de 10MB por arquivo.">
                <label 
                    htmlFor="file-upload"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`${baseDropzoneClasses} ${stateClasses}`}
                >
                   <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="sr-only"
                        accept={ALLOWED_EXTENSIONS.join(',')}
                    />
                    {dropzoneContent}
                </label>
            </Tooltip>
            {uploadError && (
                <div className="text-sm text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3" role="alert">
                    <p><strong>Falha na validação:</strong> {uploadError}. Apenas arquivos válidos foram adicionados.</p>
                </div>
            )}
            {files.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">Arquivos Selecionados:</h3>
                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between bg-slate-500/10 dark:bg-slate-700/50 p-2 pl-3 rounded-md text-sm group transition-all hover:bg-slate-500/20 dark:hover:bg-slate-700/80">
                                <div className="flex items-center space-x-3 truncate">
                                    <Icon name="file" className="w-5 h-5 text-slate-500 dark:text-sky-400 flex-shrink-0" />
                                    <span className="truncate text-slate-700 dark:text-slate-200" title={file.name}>{file.name}</span>
                                </div>
                                <Tooltip text="Remover este arquivo">
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 opacity-50 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Remover arquivo ${file.name}`}
                                    >
                                        <Icon name="close" className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};