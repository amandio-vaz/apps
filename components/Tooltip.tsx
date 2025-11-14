import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className = '' }) => {
  return (
    <div className={`group relative inline-flex items-center justify-center ${className}`}>
      {children}
      <div 
        role="tooltip"
        className="absolute bottom-full mb-2 w-max max-w-xs scale-0 transform-gpu transition-all rounded-md bg-gray-900 dark:bg-slate-800 shadow-lg p-2 text-xs font-medium text-white group-hover:scale-100 group-focus-within:scale-100 dark:text-slate-100 z-50 origin-bottom whitespace-normal text-center"
      >
        {text}
      </div>
    </div>
  );
};