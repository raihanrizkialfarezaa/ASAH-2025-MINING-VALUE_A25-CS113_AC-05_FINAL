import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X, Check, Loader2 } from 'lucide-react';

const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  displayKey = 'label',
  valueKey = 'value',
  renderOption,
  renderSelected,
  pageSize = 10,
  disabled = false,
  className = '',
  emptyMessage = 'No options found',
  loading = false,
  showCount = true,
  allowClear = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const searchValue = typeof option === 'object' ? option[displayKey] || '' : String(option);
    return searchValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Paginate filtered options
  const totalPages = Math.ceil(filteredOptions.length / pageSize);
  const paginatedOptions = filteredOptions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Get selected option
  const selectedOption = options.find((option) => {
    const optionValue = typeof option === 'object' ? option[valueKey] : option;
    return optionValue === value;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSelect = (option) => {
    const newValue = typeof option === 'object' ? option[valueKey] : option;
    onChange(newValue);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getDisplayText = (option) => {
    if (!option) return placeholder;
    if (renderSelected) return renderSelected(option);
    return typeof option === 'object' ? option[displayKey] : String(option);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 flex items-center justify-between gap-2
          bg-slate-800/60 backdrop-blur-sm border rounded-xl text-left
          transition-all duration-200 ease-out
          ${isOpen ? 'border-blue-500/50 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10' : 'border-slate-700/50 hover:border-slate-600/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800/80'}
          ${value ? 'text-slate-100' : 'text-slate-400'}
        `}
      >
        <span className="truncate flex-1">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading...</span>
            </span>
          ) : (
            getDisplayText(selectedOption)
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {value && allowClear && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            {showCount && (
              <div className="mt-2 text-xs text-slate-500">
                Showing {paginatedOptions.length} of {filteredOptions.length} results
                {searchTerm && ` for "${searchTerm}"`}
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {paginatedOptions.length > 0 ? (
              paginatedOptions.map((option, index) => {
                const optionValue = typeof option === 'object' ? option[valueKey] : option;
                const isSelected = optionValue === value;

                return (
                  <button
                    key={optionValue || index}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150
                      ${isSelected ? 'bg-blue-500/20 text-blue-100 border-l-2 border-blue-500' : 'hover:bg-slate-800/50 text-slate-300 hover:text-slate-100 border-l-2 border-transparent'}
                    `}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm">{getDisplayText(option)}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                      </>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">{emptyMessage}</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${currentPage === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/20'}
                `}
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`
                        w-8 h-8 text-xs font-medium rounded-lg transition-all
                        ${pageNum === currentPage ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${currentPage === totalPages ? 'text-slate-600 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/20'}
                `}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default SearchableDropdown;
