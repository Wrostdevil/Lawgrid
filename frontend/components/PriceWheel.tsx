'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/all';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(Observer);
}

interface PriceWheelProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

const ITEM_WIDTH = 70;

export function PriceWheel({ options, selectedIndex, onChange, className = '' }: PriceWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Update internal state and animate when prop changes
  useEffect(() => {
    animateTo(selectedIndex);
  }, [selectedIndex]);

  const animateTo = useCallback((index: number) => {
    if (!wheelRef.current) return;

    // Animate the wheel position
    gsap.to(wheelRef.current, {
      x: -(index * ITEM_WIDTH + ITEM_WIDTH / 2),
      duration: 0.5,
      ease: 'power3.out',
      overwrite: true
    });

    // Animate the items (scale/opacity)
    const items = wheelRef.current.children;
    for (let i = 0; i < items.length; i++) {
      const dist = Math.abs(i - index);
      const isSelected = dist === 0;

      gsap.to(items[i], {
        scale: isSelected ? 1.05 : Math.max(0.7, 1 - dist * 0.15),
        opacity: isSelected ? 1 : Math.max(0.15, 1 - dist * 0.25),
        duration: 0.4,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let currentIdx = selectedIndex;
    let accumulatedDelta = 0;
    const THRESHOLD = 100; // Increased threshold to match standard scroll notch

    const updateIndex = (delta: number) => {
      accumulatedDelta += delta;

      if (Math.abs(accumulatedDelta) >= THRESHOLD) {
        const direction = accumulatedDelta > 0 ? 1 : -1;
        const newIdx = Math.max(0, Math.min(options.length - 1, currentIdx - direction));

        if (newIdx !== currentIdx) {
          currentIdx = newIdx;
          onChange(newIdx);
        }
        accumulatedDelta = 0; // Reset after one move to prevent "runaway" scrolling
      }
    };

    const obs = Observer.create({
      target: containerRef.current,
      type: 'wheel,touch,pointer',
      onWheel: (self) => {
        updateIndex(self.deltaY);
      },
      onDrag: (self) => {
        updateIndex(-self.deltaX); // Drag is inverted compared to scroll
      },
      tolerance: 10,
      preventDefault: true
    });

    return () => obs.kill();
  }, [options.length, onChange, selectedIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full md:w-[250px] h-12 bg-[#f5eee2] dark:bg-[#0a152e] shrink-0 flex items-center justify-center overflow-hidden rounded-full border border-[#dcc7aa] dark:border-[#cdaa80]/20 shadow-[inset_0_2px_8px_rgba(153,121,83,0.12),_0_10px_24px_rgba(68,56,49,0.08)] dark:shadow-[inset_0_4px_12px_rgba(0,0,0,0.5),_0_8px_32px_rgba(0,0,0,0.4)] touch-none cursor-grab active:cursor-grabbing ${className}`}
    >
      <div className="absolute left-0 w-12 h-full bg-gradient-to-r from-[#f5eee2] via-[#f5eee2]/80 to-transparent dark:from-[#0a152e] dark:via-[#0a152e]/80 z-20 pointer-events-none rounded-l-full" />
      <div className="absolute right-0 w-12 h-full bg-gradient-to-l from-[#f5eee2] via-[#f5eee2]/80 to-transparent dark:from-[#0a152e] dark:via-[#0a152e]/80 z-20 pointer-events-none rounded-r-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[34px] bg-white/90 dark:bg-[#cdaa80]/15 border border-[#c7ab88] dark:border-[#cdaa80]/70 rounded-full z-10 pointer-events-none shadow-[0_0_18px_rgba(153,121,83,0.16)] dark:shadow-[0_0_20px_rgba(205,170,128,0.3)]" />

      <div
        ref={wheelRef}
        className="absolute top-1/2 left-1/2 flex items-center z-10"
        style={{ transform: `translate(calc(-${selectedIndex * ITEM_WIDTH + ITEM_WIDTH / 2}px), -50%)` }}
      >
        {options.map((price, idx) => {
          const dist = Math.abs(idx - selectedIndex);
          const isSelected = dist === 0;
          return (
            <div
              key={`${price}-${idx}`}
              onClick={() => {
                onChange(idx);
              }}
              className={`w-[70px] shrink-0 text-center cursor-pointer font-serif tracking-wide text-[14px] select-none ${isSelected
                  ? 'text-[#997953] drop-shadow-[0_0_10px_rgba(153,121,83,0.28)] dark:text-[#cdaa80] dark:drop-shadow-[0_0_12px_rgba(205,170,128,1)]'
                  : 'text-[#7b6958]/60 hover:text-[#443831] dark:text-[#cdaa80]/50 dark:hover:text-[#cdaa80]/80'
                }`}
            >
              {price}
            </div>
          );
        })}
      </div>
    </div>
  );
}
