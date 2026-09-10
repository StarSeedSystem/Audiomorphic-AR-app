import React, { useEffect, useRef } from 'react';
import { VisualizerParams } from '../types';

interface BackgroundLayerProps {
  params: VisualizerParams;
  getAudioMetrics: (sensitivity: number, freqRange: number) => { volume: number; frequency: number };
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ params, getAudioMetrics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const reqRef = useRef<number>(0);
  const bubblesRef = useRef(Array.from({ length: 30 }).map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 50 + 10,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    hue: Math.random() * 360
  })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const audioMetrics = getAudioMetrics(params.sensitivity, params.freqRange);
      timeRef.current += 0.01 * params.bgSpeed * (params.bgAnimatable ? 1 : 0);
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const bgColors = params.bgColors || ['#000000', '#1a1a2e'];

      // Base background
      if (params.bgMode === 'solid') {
        ctx.fillStyle = bgColors[0] || '#000000';
        ctx.fillRect(0, 0, w, h);
      } else if (params.bgMode === 'gradient') {
        const grad = ctx.createLinearGradient(
          0, 0, 
          params.bgAnimatable ? w * Math.cos(t) : w, 
          params.bgAnimatable ? h * Math.sin(t) : h
        );
        bgColors.forEach((color, i) => {
          grad.addColorStop(i / Math.max(1, bgColors.length - 1), color);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (params.bgMode === 'liquid-rainbow') {
        for (let x = 0; x < w; x += 20) {
          for (let y = 0; y < h; y += 20) {
            const hue = (x * 0.1 + y * 0.1 + t * 50 + audioMetrics.volume * 100) % 360;
            ctx.fillStyle = `hsl(${hue}, 80%, 20%)`;
            ctx.fillRect(x, y, 20, 20);
          }
        }
      } else if (params.bgMode === 'crystal-bubbles') {
        ctx.fillStyle = bgColors[0] || '#000000';
        ctx.fillRect(0, 0, w, h);
        
        bubblesRef.current.forEach(b => {
          b.x += b.vx * (1 + audioMetrics.volume * 5);
          b.y += b.vy * (1 + audioMetrics.volume * 5);
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;

          const grad = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, Math.max(0, b.r*0.1), b.x, b.y, Math.max(0, b.r));
          grad.addColorStop(0, `hsla(${b.hue + t*50}, 80%, 80%, 0.8)`);
          grad.addColorStop(1, `hsla(${b.hue + t*50}, 80%, 20%, 0.1)`);
          
          ctx.beginPath();
          ctx.arc(b.x, b.y, Math.max(0, b.r), 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          
          // Reflection
          ctx.beginPath();
          ctx.arc(b.x - b.r*0.3, b.y - b.r*0.3, Math.max(0, b.r*0.2), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();
        });
      } else if (params.bgMode === 'organic-fade') {
        const c1 = bgColors[0] || '#000000';
        const c2 = bgColors[1] || '#1a1a2e';
        const r1 = parseInt(c1.slice(1, 3), 16) || 0;
        const g1 = parseInt(c1.slice(3, 5), 16) || 0;
        const b1 = parseInt(c1.slice(5, 7), 16) || 0;
        const r2 = parseInt(c2.slice(1, 3), 16) || 0;
        const g2 = parseInt(c2.slice(3, 5), 16) || 0;
        const b2 = parseInt(c2.slice(5, 7), 16) || 0;
        
        const mix = (Math.sin(t) + 1) / 2;
        const r = Math.round(r1 * mix + r2 * (1 - mix));
        const g = Math.round(g1 * mix + g2 * (1 - mix));
        const b = Math.round(b1 * mix + b2 * (1 - mix));
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, w, h);
      } else if (params.bgMode === 'morphing-colors') {
        const grad = ctx.createRadialGradient(
          w/2 + Math.cos(t*0.5)*w*0.2, h/2 + Math.sin(t*0.7)*h*0.2, 0,
          w/2, h/2, Math.max(w, h)
        );
        bgColors.forEach((color, i) => {
          grad.addColorStop(i / Math.max(1, bgColors.length - 1), color);
        });
        if (bgColors.length === 0) {
          grad.addColorStop(0, `hsl(${(t*20)%360}, 70%, 20%)`);
          grad.addColorStop(0.5, `hsl(${((t*20)+120)%360}, 70%, 15%)`);
          grad.addColorStop(1, `hsl(${((t*20)+240)%360}, 70%, 10%)`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Vignette
      if (params.bgVignette) {
        const vignette = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, `rgba(0,0,0,${params.bgVignetteIntensity})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
      }

      reqRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [params.bgMode, params.bgColors, params.bgSpeed, params.bgAnimatable, params.bgVignette, params.bgVignetteIntensity, params.sensitivity, params.freqRange, getAudioMetrics]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
};
