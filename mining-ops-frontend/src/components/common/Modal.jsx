import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
    md: 'max-w-[calc(100vw-2rem)] sm:max-w-2xl',
    lg: 'max-w-[calc(100vw-2rem)] sm:max-w-4xl',
    xl: 'max-w-[calc(100vw-2rem)] sm:max-w-6xl',
    '2xl': 'max-w-[calc(100vw-2rem)] sm:max-w-5xl',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sizeClasses[size]} mx-4 sm:mx-auto max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 sm:mb-4 sticky top-0 bg-inherit z-10 pb-2 border-b border-slate-700/30 -mt-1">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold pr-4 line-clamp-2">{title}</h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-700/50 rounded-lg sm:rounded-full flex-shrink-0 transition-colors">
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="text-sm sm:text-base">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
