import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  // Show fewer pages on mobile
  const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1} 
        className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {startPage > 1 && (
        <>
          <button 
            onClick={() => onPageChange(1)} 
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-slate-700/50 text-xs sm:text-sm font-medium transition-colors"
          >
            1
          </button>
          {startPage > 2 && <span className="px-1 sm:px-2 text-slate-500 text-xs sm:text-sm">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button 
          key={page} 
          onClick={() => onPageChange(page)} 
          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            currentPage === page 
              ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' 
              : 'hover:bg-slate-700/50'
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-1 sm:px-2 text-slate-500 text-xs sm:text-sm">...</span>}
          <button 
            onClick={() => onPageChange(totalPages)} 
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-slate-700/50 text-xs sm:text-sm font-medium transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages} 
        className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default Pagination;
