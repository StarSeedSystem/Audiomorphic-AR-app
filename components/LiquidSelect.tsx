import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Lock } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  locked?: boolean;
}

interface LiquidSelectProps {
  value: string;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

const computeDropdownPosition = (el: HTMLElement): DropdownPos => {
  const rect = el.getBoundingClientRect();
  const margin = 8;
  const maxWidth = Math.max(160, window.innerWidth - margin * 2);
  const width = Math.min(rect.width, maxWidth);
  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const openUpward = spaceBelow < 220 && rect.top > spaceBelow;
  return {
    top: openUpward ? Math.max(margin, rect.top - 4) : rect.bottom + 4,
    left,
    width,
    openUpward,
  };
};

const LiquidSelect: React.FC<LiquidSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current) {
      setDropdownPos(computeDropdownPosition(containerRef.current));
    }
  }, []);

  useEffect(() => {
    let portal = document.getElementById('liquid-select-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'liquid-select-portal';
      portal.style.position = 'fixed';
      portal.style.top = '0';
      portal.style.left = '0';
      portal.style.width = '0';
      portal.style.height = '0';
      portal.style.zIndex = '99999';
      portal.style.pointerEvents = 'none';
      document.body.appendChild(portal);
    }
    setPortalNode(portal);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalEl = document.getElementById('liquid-select-portal');
        if (portalEl && portalEl.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      setDropdownPos(computeDropdownPosition(containerRef.current));
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          className="w-full h-11 px-4 flex items-center justify-between rounded-xl morph-btn-glass text-white transition-[transform,opacity] duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption?.locked && <Lock size={14} className="text-purple-300 shrink-0" />}
            <span className="text-sm font-medium truncate">
              {selectedOption ? selectedOption.label : placeholder || 'Seleccionar...'}
            </span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.24, ease: 'circOut' }}>
            <ChevronDown size={18} className="morph-accent-text" />
          </motion.div>
        </button>
      </div>

      {portalNode &&
        ReactDOM.createPortal(
          <AnimatePresence>
            {isOpen && dropdownPos && (
              <motion.div
                key="liquid-select-menu"
                initial={{ opacity: 0, y: dropdownPos.openUpward ? 8 : -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dropdownPos.openUpward ? 8 : -8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  transform: dropdownPos.openUpward ? 'translateY(-100%)' : undefined,
                  zIndex: 99999,
                  pointerEvents: 'auto',
                }}
                className="p-1.5 rounded-xl art-nouveau-frame backdrop-blur-3xl overflow-hidden"
              >
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-sm rounded-lg transition-opacity duration-150 cursor-pointer ${
                        value === opt.value
                          ? 'morph-tab-active font-bold'
                          : 'text-white/85 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.locked && <Lock size={14} className="text-purple-300 opacity-70" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalNode
        )}
    </>
  );
};

export default LiquidSelect;
