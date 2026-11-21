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

const LiquidSelect: React.FC<LiquidSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalEl = document.getElementById('liquid-select-portal');
        if (portalEl && portalEl.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!document.getElementById('liquid-select-portal')) {
      const portal = document.createElement('div');
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
  }, []);

  const dropdownContent =
    isOpen && dropdownPos
      ? ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
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
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-sm rounded-lg transition-all cursor-pointer ${
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
          </AnimatePresence>,
          document.getElementById('liquid-select-portal') || document.body
        )
      : null;

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-11 px-4 flex items-center justify-between rounded-xl morph-btn-glass text-white transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption?.locked && <Lock size={14} className="text-purple-300 shrink-0" />}
            <span className="text-sm font-medium truncate">
              {selectedOption ? selectedOption.label : placeholder || 'Seleccionar...'}
            </span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: 'circOut' }}>
            <ChevronDown size={18} className="morph-accent-text" />
          </motion.div>
        </button>
      </div>
      {dropdownContent}
    </>
  );
};

export default LiquidSelect;
