import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Loader2, Search } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Input autocomplete yang menarik data dari PDDikti.
 *
 * Dua mode:
 * - Pencarian global (default): type 'pt' atau 'prodi' tanpa prop ptId → memanggil /search/{type}.
 * - Prodi-per-PT (dependent): type 'prodi' + prop ptId → memuat daftar prodi milik PT terpilih
 *   lalu memfilter secara lokal. Disabled selama ptId masih kosong.
 *
 * Dropdown dirender lewat portal ke document.body dengan position: fixed,
 * supaya tidak terpotong oleh kontainer ber-overflow (mis. wrapper form yang scroll).
 *
 * Props:
 * - type: 'pt' | 'prodi'
 * - name: string
 * - value: string                 (nilai terkontrol)
 * - onChange: (value) => void
 * - onSelect?: (item) => void
 * - icon: ReactNode
 * - placeholder: string
 * - ptId?: string                 (aktifkan mode prodi-per-PT; '' = belum ada PT)
 * - disabledPlaceholder?: string  (placeholder saat disabled di mode dependent)
 */
const PddiktiAutocomplete = ({
  type,
  name,
  value,
  onChange,
  onSelect,
  icon,
  placeholder,
  ptId,
  disabledPlaceholder,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [allProdi, setAllProdi] = useState([]); // cache prodi PT (mode dependent)
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [coords, setCoords] = useState(null);
  const inputRef = useRef(null);
  const justSelected = useRef(false);

  // Mode "prodi milik PT" aktif jika type prodi dan prop ptId diberikan.
  const ptMode = type === 'prodi' && ptId !== undefined;
  const disabled = ptMode && !ptId;

  // Hitung posisi dropdown relatif viewport (fixed), bisa membuka ke atas bila sempit.
  const updateCoords = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    setCoords({
      left: r.left,
      width: r.width,
      openUp,
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.min(240, (openUp ? spaceAbove : spaceBelow) - 16),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const handler = () => updateCoords();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, suggestions, updateCoords]);

  // Tutup dropdown saat klik di luar input & dropdown.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-pddikti-dropdown]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const labelOf = (item) =>
    type === 'pt'
      ? item.nama
      : `${item.nama}${item.jenjang ? ` (${item.jenjang})` : ''}`;

  const subLabelOf = (item) => {
    if (type === 'pt') {
      return [item.namaSingkat, item.kode].filter(Boolean).join(' • ');
    }
    // prodi
    if (item.akreditasi) return `Akreditasi: ${item.akreditasi}`;
    return item.pt || '';
  };

  // === Mode dependent: muat daftar prodi milik PT saat ptId berubah ===
  useEffect(() => {
    if (!ptMode) return;
    if (!ptId || ptId === 'manual') {
      setAllProdi([]);
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/pddikti/pt/prodi`, {
          params: { idPt: ptId },
        });
        if (!cancelled) setAllProdi(res.data?.data || []);
      } catch {
        if (!cancelled) setAllProdi([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ptId, ptMode]);

  // Mode dependent: filter lokal saat user mengetik / daftar termuat.
  useEffect(() => {
    if (!ptMode) return;
    const term = (value || '').trim().toLowerCase();
    const filtered = term
      ? allProdi.filter((p) => labelOf(p).toLowerCase().includes(term))
      : allProdi;
    setSuggestions(filtered.slice(0, 50));
    setHighlight(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, allProdi, ptMode]);

  // === Mode pencarian global: debounce 350ms ke /search/{type} ===
  useEffect(() => {
    if (ptMode) return; // ditangani efek mode dependent di atas
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const term = (value || '').trim();
    if (term.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/pddikti/search/${type}`, {
          params: { keyword: term, limit: 8 },
        });
        if (!cancelled) {
          setSuggestions(res.data?.data || []);
          setOpen(true);
          setHighlight(-1);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, type, ptMode]);

  const handleSelect = (item) => {
    justSelected.current = true;
    onChange(labelOf(item));
    if (onSelect) onSelect(item);
    setOpen(false);
    if (!ptMode) setSuggestions([]);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleFocus = () => {
    if (ptMode && allProdi.length > 0) setOpen(true);
    else if (!ptMode && suggestions.length > 0) setOpen(true);
  };

  const dropdown =
    open && suggestions.length > 0 && coords
      ? createPortal(
          <ul
            data-pddikti-dropdown
            style={{
              position: 'fixed',
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              maxHeight: coords.maxHeight,
            }}
            className="z-[9999] overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-300/60 py-1 text-left"
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.id || idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  highlight === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-[13px] font-semibold text-slate-800 leading-tight">
                  {labelOf(item)}
                </p>
                {subLabelOf(item) && (
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                    {subLabelOf(item)}
                  </p>
                )}
              </li>
            ))}
            <li className="px-3 pt-1.5 pb-0.5 text-[9px] text-slate-300 font-medium border-t border-slate-100 mt-1">
              Sumber: PDDikti (data publik)
            </li>
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="relative group">
      <div
        className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 ${
          disabled ? 'opacity-40' : ''
        }`}
      >
        {icon}
      </div>
      <input
        ref={inputRef}
        type="text"
        name={name}
        autoComplete="off"
        disabled={disabled}
        className="block w-full pl-9 pr-8 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        placeholder={disabled ? (disabledPlaceholder || 'Pilih institusi dulu') : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
        ) : (
          <Search className={`h-3.5 w-3.5 text-slate-300 ${disabled ? 'opacity-40' : ''}`} />
        )}
      </div>
      {dropdown}
    </div>
  );
};

export default PddiktiAutocomplete;
