import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check, Users } from 'lucide-react';

/**
 * MultiSelectDropdown - Dropdown desplegable compacto con selección múltiple y buscador
 * Evita la saturación vertical de los formularios de registro cuando hay muchos PMs o Streamers.
 */
export default function MultiSelectDropdown({
  label,
  placeholder = 'Seleccionar opciones...',
  searchPlaceholder = 'Buscar...',
  items = [],
  selectedIds = [],
  onChange,
  icon: Icon = Users,
  accentColor = 'amber', // 'amber' | 'blue' | 'emerald' | 'purple'
  helperText,
  maxDisplayTags = 2
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

  // Filter items based on search
  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchLabel = (item.label || '').toLowerCase().includes(q);
    const matchSub = (item.sublabel || '').toLowerCase().includes(q);
    const matchBadge = (item.badge || '').toLowerCase().includes(q);
    return matchLabel || matchSub || matchBadge;
  });

  const toggleItem = (id) => {
    if (safeSelectedIds.includes(id)) {
      onChange(safeSelectedIds.filter(itemId => itemId !== id));
    } else {
      onChange([...safeSelectedIds, id]);
    }
  };

  const selectAll = () => {
    const allFilteredIds = filteredItems.map(i => i.id);
    const union = Array.from(new Set([...safeSelectedIds, ...allFilteredIds]));
    onChange(union);
  };

  const deselectAll = () => {
    const filteredIdsSet = new Set(filteredItems.map(i => i.id));
    onChange(safeSelectedIds.filter(id => !filteredIdsSet.has(id)));
  };

  // Selected item objects for preview tags
  const selectedItems = items.filter(i => safeSelectedIds.includes(i.id));

  // Accent color classes
  const theme = {
    amber: {
      borderFocus: 'focus:border-amber-500 border-amber-500/40',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      tag: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      checkbox: 'text-amber-500 focus:ring-amber-500',
      highlight: 'text-amber-400'
    },
    blue: {
      borderFocus: 'focus:border-blue-500 border-blue-500/40',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      tag: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      checkbox: 'text-blue-500 focus:ring-blue-500',
      highlight: 'text-blue-400'
    },
    emerald: {
      borderFocus: 'focus:border-emerald-500 border-emerald-500/40',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      checkbox: 'text-emerald-500 focus:ring-emerald-500',
      highlight: 'text-emerald-400'
    },
    purple: {
      borderFocus: 'focus:border-purple-500 border-purple-500/40',
      badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      tag: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      checkbox: 'text-purple-500 focus:ring-purple-500',
      highlight: 'text-purple-400'
    }
  }[accentColor] || {
    borderFocus: 'focus:border-amber-500',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    tag: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    checkbox: 'text-amber-500 focus:ring-amber-500',
    highlight: 'text-amber-400'
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-300">
            {label}
          </label>
          {safeSelectedIds.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
              {safeSelectedIds.length} {safeSelectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-1.5 bg-slate-950 border rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
          isOpen ? `border-slate-600 ring-2 ring-slate-700/50 bg-slate-900` : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap py-0.5">
          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
          
          {selectedItems.length === 0 ? (
            <span className="text-xs text-slate-500 truncate">
              {placeholder}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedItems.slice(0, maxDisplayTags).map(item => (
                <span
                  key={item.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${theme.tag}`}
                >
                  <span className="truncate max-w-[120px]">{item.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                    className="hover:text-red-400 transition-colors ml-0.5"
                    title="Remover"
                  >
                    ×
                  </span>
                </span>
              ))}

              {selectedItems.length > maxDisplayTags && (
                <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded-md">
                  +{selectedItems.length - maxDisplayTags} más
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {safeSelectedIds.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="p-1 hover:text-red-400 transition-colors rounded"
              title="Limpiar todos"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
        </div>
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
            <span>
              {filteredItems.length} {filteredItems.length === 1 ? 'disponible' : 'disponibles'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className={`font-semibold hover:underline text-[11px] ${theme.highlight}`}
              >
                Seleccionar todos
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="hover:underline text-[11px] text-slate-400 hover:text-slate-200"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Scrollable Items List */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No se encontraron coincidencias.
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = safeSelectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected 
                        ? 'bg-slate-800/90 text-white' 
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-black' 
                          : 'border-slate-700 bg-slate-950'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span className="text-[10px] text-slate-400 truncate shrink-0">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ml-2 ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Done Button */}
          <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-500">
              {safeSelectedIds.length} seleccionado(s)
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>

        </div>
      )}

      {helperText && (
        <span className="text-[10px] text-slate-500 block mt-1">
          {helperText}
        </span>
      )}
    </div>
  );
}
