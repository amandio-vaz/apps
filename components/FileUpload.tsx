
import React, { useCallback, useRef } from 'react';
import { Icon } from './Icon';

interface FileUploadProps {
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(Array.from(event.target.files));
        }
    };

    const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
    }, []);
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files) {
            setFiles(Array.from(event.dataTransfer.files));
        }
    }, [setFiles]);

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">1. Anexar Documentos</h2>
            <label 
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
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.md,.json,.html,.yaml,.yml,.docx,.txt,.png,.jpg,.jpeg"
                />
            </label>
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
