'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';

interface LiquidSliderProps {
  leftLabel: string;
  rightLabel: string;
  value: 'left' | 'right';
  onChange: (value: 'left' | 'right') => void;
}

export function LiquidSlider({ leftLabel, rightLabel, value, onChange }: LiquidSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftLabelRef = useRef<HTMLSpanElement>(null);
  const rightLabelRef = useRef<HTMLSpanElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef<number>(0);

  // Water simulation state
  const waterRef = useRef({
    // Position of the liquid mass center (0 = left, 1 = right)
    position: value === 'left' ? 0 : 1,
    velocity: 0,
    // Array of wave amplitudes for surface ripples
    wavePoints: new Array(60).fill(0),
    waveVelocities: new Array(60).fill(0),
    // Splash particles
    splashes: [] as { x: number; y: number; vx: number; vy: number; life: number; size: number }[],
    // Idle wave phase
    idlePhase: 0,
  });

  // ── Canvas rendering loop ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 180;
    const H = 42;
    canvas.width = W * 2; // retina
    canvas.height = H * 2;
    ctx.scale(2, 2);

    const water = waterRef.current;
    const DAMPING = 0.92;
    const SPREAD = 0.15;
    const TENSION = 0.012;

    function render() {
      ctx.clearRect(0, 0, W, H);

      // ... [Wave physics logic remains same] ...
      const numPoints = water.wavePoints.length;
      for (let i = 0; i < numPoints; i++) {
        const force = -TENSION * water.wavePoints[i];
        water.waveVelocities[i] += force;
        water.waveVelocities[i] *= DAMPING;
        water.wavePoints[i] += water.waveVelocities[i];
      }

      for (let pass = 0; pass < 3; pass++) {
        const deltas = new Array(numPoints).fill(0);
        for (let i = 0; i < numPoints; i++) {
          if (i > 0) {
            deltas[i] += SPREAD * (water.wavePoints[i] - water.wavePoints[i - 1]);
            water.waveVelocities[i - 1] += SPREAD * (water.wavePoints[i] - water.wavePoints[i - 1]);
          }
          if (i < numPoints - 1) {
            deltas[i] += SPREAD * (water.wavePoints[i] - water.wavePoints[i + 1]);
            water.waveVelocities[i + 1] += SPREAD * (water.wavePoints[i] - water.wavePoints[i + 1]);
          }
        }
        for (let i = 0; i < numPoints; i++) {
          water.wavePoints[i] -= deltas[i] * 0.5;
        }
      }

      water.idlePhase += 0.02;

      // Compute liquid position on track - updated for smaller W/H
      const liquidX = 6 + water.position * (W - 84);
      const liquidW = 72;
      const liquidH = 30;
      const liquidY = (H - liquidH) / 2;
      const liquidR = liquidH / 2;

      // ── Draw liquid body with wave surface ──────────────
      ctx.save();
      const gradient = ctx.createLinearGradient(liquidX, liquidY, liquidX, liquidY + liquidH);
      gradient.addColorStop(0, '#e8c06a');
      gradient.addColorStop(0.3, '#d4a853');
      gradient.addColorStop(0.7, '#c49a45');
      gradient.addColorStop(1, '#a67830');

      ctx.beginPath();
      const surfaceY = liquidY + 4; 
      const baseY = liquidY + liquidH;

      ctx.moveTo(liquidX + liquidR, baseY);
      ctx.lineTo(liquidX + liquidW - liquidR, baseY);
      ctx.arc(liquidX + liquidW - liquidR, baseY - liquidR, liquidR, Math.PI / 2, 0, true);
      ctx.lineTo(liquidX + liquidW, surfaceY + 2);

      for (let i = numPoints - 1; i >= 0; i--) {
        const t = i / (numPoints - 1);
        const wx = liquidX + t * liquidW;
        const idle = Math.sin(water.idlePhase + t * Math.PI * 3) * 0.8;
        const wy = surfaceY + water.wavePoints[i] + idle;
        if (i === numPoints - 1) ctx.lineTo(wx, wy);
        else {
          const nextT = (i + 1) / (numPoints - 1);
          const nextX = liquidX + nextT * liquidW;
          const nextIdle = Math.sin(water.idlePhase + nextT * Math.PI * 3) * 0.8;
          const nextY = surfaceY + water.wavePoints[i + 1] + nextIdle;
          ctx.quadraticCurveTo(nextX, nextY, (wx + nextX) / 2, (wy + nextY) / 2);
        }
      }

      ctx.lineTo(liquidX, surfaceY + 2);
      ctx.arc(liquidX + liquidR, baseY - liquidR, liquidR, Math.PI, Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // ── Surface line ──
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const wx = liquidX + t * liquidW;
        const idle = Math.sin(water.idlePhase + t * Math.PI * 3) * 0.8;
        const wy = surfaceY + water.wavePoints[i] + idle;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = 'rgba(255, 240, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Splash particles ──
      ctx.fillStyle = '#e8c06a';
      for (let i = water.splashes.length - 1; i >= 0; i--) {
        const p = water.splashes[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
        if (p.life <= 0) { water.splashes.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleSwitch = useCallback((newValue: 'left' | 'right') => {
    if (isAnimating || newValue === value) return;
    setIsAnimating(true);

    const water = waterRef.current;
    const isGoingRight = newValue === 'right';
    const targetPos = isGoingRight ? 1 : 0;
    const W = 180;

    const spawnX = 6 + water.position * (W - 84) + 36;
    for (let i = 0; i < 6; i++) {
      water.splashes.push({
        x: spawnX + (Math.random() - 0.5) * 30,
        y: 8 + Math.random() * 4,
        vx: (isGoingRight ? 0.8 : -0.8) * (Math.random() * 1.5 + 0.5),
        vy: -(Math.random() * 2 + 1),
        life: 0.5 + Math.random() * 0.3,
        size: 1 + Math.random() * 1.5,
      });
    }

    const numPoints = water.wavePoints.length;
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const dirForce = isGoingRight ? Math.sin(t * Math.PI) * 4 : Math.sin((1 - t) * Math.PI) * 4;
      water.waveVelocities[i] += dirForce * (0.4 + Math.random() * 0.4);
    }

    gsap.to(water, {
      position: targetPos,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        const landX = 6 + targetPos * (W - 84) + 36;
        for (let i = 0; i < 4; i++) {
          water.splashes.push({
            x: landX + (Math.random() - 0.5) * 20,
            y: 8 + Math.random() * 3,
            vx: (Math.random() - 0.5) * 2,
            vy: -(Math.random() * 1.5 + 0.5),
            life: 0.4 + Math.random() * 0.3,
            size: 0.8 + Math.random() * 1.2,
          });
        }
        onChange(newValue);
        setIsAnimating(false);
      },
    });

    const leftEl = leftLabelRef.current;
    const rightEl = rightLabelRef.current;
    if (leftEl && rightEl) {
      gsap.to(leftEl, { color: isGoingRight ? 'rgba(205,170,128,0.5)' : '#cdaa80', duration: 0.3 });
      gsap.to(rightEl, { color: isGoingRight ? '#cdaa80' : 'rgba(205,170,128,0.5)', duration: 0.3 });
    }
  }, [isAnimating, value, onChange]);

  const isLeft = value === 'left';

  return (
    <div className="flex items-center justify-center gap-3 select-none">
      <span
        ref={leftLabelRef}
        onClick={() => handleSwitch('left')}
        className="text-[13px] font-serif font-semibold tracking-wide cursor-pointer transition-colors duration-300 min-w-[80px] text-right"
        style={{ color: isLeft ? '#cdaa80' : 'rgba(205,170,128,0.5)' }}
      >
        {leftLabel}
      </span>

      <div
        ref={trackRef}
        className="relative w-[180px] h-[42px] rounded-full cursor-pointer overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(8,18,40,0.95) 0%, rgba(12,24,50,0.98) 100%)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(205,170,128,0.1)',
        }}
        onClick={() => handleSwitch(isLeft ? 'right' : 'left')}
      >
        <div className="absolute inset-[1px] rounded-full pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(205,170,128,0.04) 0%, transparent 40%)' }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: '9999px' }} />
      </div>

      <span
        ref={rightLabelRef}
        onClick={() => handleSwitch('right')}
        className="text-[13px] font-serif font-semibold tracking-wide cursor-pointer transition-colors duration-300 min-w-[80px] text-left"
        style={{ color: isLeft ? 'rgba(205,170,128,0.5)' : '#cdaa80' }}
      >
        {rightLabel}
      </span>
    </div>
  );
}
