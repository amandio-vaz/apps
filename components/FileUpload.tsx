
import React, { useCallback, useRef, useState } from 'react';
import { Icon } from './Icon';

interface FileUploadProps {
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.json', '.html', '.yaml', '.yml', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFilesValidation = useCallback((incomingFiles: FileList | null) => {
        if (!incomingFiles) return;

        setUploadError(null);
        const filesArray = Array.from(incomingFiles);
        const validationErrors: string[] = [];
        const acceptedFiles: File[] = [];

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
            setFiles(acceptedFiles);
        } else if (filesArray.length > 0) {
            // If user selected files but all were invalid, clear the list
            setFiles([]);
        }

    }, [setFiles]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFilesValidation(event.target.files);
        // Clear the input value to allow re-selecting the same file after removing it
        event.target.value = '';
    };

    const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
    }, []);
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        handleFilesValidation(event.dataTransfer.files);
    }, [handleFilesValidation]);

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const triggerFileSelect = (event: React.MouseEvent) => {
        // Prevent the label's default behavior from triggering the input twice
        event.preventDefault();
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">1. Anexar Documentos</h2>
            <label 
                htmlFor="file-upload"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none"
            >
                <span className="flex items-center space-x-2">
                    <Icon name="upload" className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                        Arraste e solte seus arquivos aqui ou{' '}
                        <span className="text-blue-600 dark:text-blue-400 underline" onClick={triggerFileSelect}>
                            clique para selecionar
                        </span>
                    </span>
                </span>
                <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept={ALLOWED_EXTENSIONS.join(',')}
                />
            </label>
            {uploadError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-md p-3" role="alert">
                    <p><strong>Falha na validação:</strong> {uploadError}. Apenas arquivos válidos foram adicionados.</p>
                </div>
            )}
            {files.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">Arquivos Selecionados:</h3>
                    <ul className="space-y-2">
                        {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded-md text-sm">
                                <div className="flex items-center space-x-2 truncate">
                                    <Icon name="file" className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                                    <span className="truncate" title={file.name}>{file.name}</span>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label="Remove file"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
