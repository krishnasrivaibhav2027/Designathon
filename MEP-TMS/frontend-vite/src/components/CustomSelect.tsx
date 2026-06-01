import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  icon?: LucideIcon;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dropdownWidth?: number | string;
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder = 'Select option',
  className = '',
  style = {},
  dropdownWidth,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    if (disabled) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current && containerRef.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [disabled]);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      className={className}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px 8px 12px',
          paddingLeft: Icon ? '36px' : '16px',
          paddingRight: '36px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          textAlign: 'left',
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          boxShadow: isOpen ? '0 0 12px var(--powder-blue-glow)' : 'none',
          borderColor: isOpen ? 'var(--powder-blue)' : 'var(--border-color)',
          transition: 'all 0.3s ease',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        {Icon && (
          <Icon
            size={16}
            color="var(--text-secondary)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          color="var(--text-secondary)"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            transition: 'transform 0.25s ease',
            pointerEvents: 'none',
          }}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: coords.top + 6,
                left: coords.left,
                zIndex: 9999,
                width: dropdownWidth || coords.width,
                minWidth: coords.width,
                background: 'var(--bg-dropdown, var(--bg-card))',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                overflow: 'hidden',
                padding: 4,
              }}
            >
              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
                className="custom-scrollbar"
              >
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: isSelected ? '#121824' : 'var(--text-primary)',
                        background: isSelected 
                          ? 'linear-gradient(135deg, var(--powder-blue) 0%, var(--yellow) 100%)' 
                          : 'transparent',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          const isDark = document.documentElement.classList.contains('dark');
                          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(135, 206, 235, 0.12)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {opt.label}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
