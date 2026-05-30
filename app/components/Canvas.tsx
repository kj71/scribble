"use client"
import React, { useRef, useState, useEffect } from 'react';

interface CanvasProps {
  isDrawer: boolean;
  socket: any;
}

export default function Canvas({ isDrawer, socket }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b');
  const [brushWidth, setBrushWidth] = useState(5);
  const [tool, setTool] = useState<'marker' | 'eraser' | 'fill'>('marker');
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);

  const activeStrokeColor = tool === 'eraser' ? '#ffffff' : color;

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const hex = fillColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = 255;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    if (startR === r && startG === g && startB === b && startA === a) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    const matchesStart = (idx: number) => {
      return Math.abs(data[idx] - startR) < 15 &&
             Math.abs(data[idx + 1] - startG) < 15 &&
             Math.abs(data[idx + 2] - startB) < 15 &&
             Math.abs(data[idx + 3] - startA) < 15;
    };

    while (stack.length > 0) {
      const curr = stack.pop();
      if (!curr) continue;
      const [cx, cy] = curr;
      const key = cy * width + cx;

      if (visited[key]) continue;
      visited[key] = 1;

      const idx = key * 4;
      if (matchesStart(idx)) {
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;

        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < width - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < height - 1) stack.push([cx, cy + 1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    if (!socket) return;

    const handleDrawEvent = (data: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (data.type === 'draw') {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(data.prevX, data.prevY);
        ctx.lineTo(data.currX, data.currY);
        ctx.stroke();
      } else if (data.type === 'fill') {
        floodFill(Math.round(data.x), Math.round(data.y), data.color);
      } else if (data.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('draw-event', handleDrawEvent);
    return () => {
      socket.off('draw-event', handleDrawEvent);
    };
  }, [socket]);

  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const coords = getMouseCoords(e);
    if (!coords) return;

    if (tool === 'fill') {
      const startX = Math.round(coords.x);
      const startY = Math.round(coords.y);
      floodFill(startX, startY, activeStrokeColor);
      socket.emit('draw-event', {
        type: 'fill',
        x: startX,
        y: startY,
        color: activeStrokeColor
      });
    } else {
      setIsDrawing(true);
      prevPosRef.current = coords;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing || tool === 'fill') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getMouseCoords(e);
    if (!coords || !prevPosRef.current) return;

    ctx.strokeStyle = activeStrokeColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prevPosRef.current.x, prevPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    socket.emit('draw-event', {
      type: 'draw',
      prevX: prevPosRef.current.x,
      prevY: prevPosRef.current.y,
      currX: coords.x,
      currY: coords.y,
      color: activeStrokeColor,
      width: brushWidth
    });

    prevPosRef.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    prevPosRef.current = null;
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('draw-event', { type: 'clear' });
  };

  const colors = [
    { value: '#1e293b', name: 'Slate' },
    { value: '#ef4444', name: 'Red' },
    { value: '#3b82f6', name: 'Blue' },
    { value: '#10b981', name: 'Green' },
    { value: '#f59e0b', name: 'Yellow' },
    { value: '#8b5cf6', name: 'Purple' }
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl animate-fade-in">
      <div className="relative w-full aspect-[3/2] bg-white rounded-xl overflow-hidden shadow-inner border border-slate-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={533}
          className={`w-full h-full ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {isDrawer && (
        <div className="flex flex-wrap items-center justify-between w-full mt-4 gap-4 p-3 bg-slate-900/60 rounded-xl border border-white/10">
          {/* Tool Toggles */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setTool('marker')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                tool === 'marker' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ✏️ Marker
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                tool === 'eraser' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🧽 Eraser
            </button>
            <button
              onClick={() => setTool('fill')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                tool === 'fill' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🪣 Fill
            </button>
          </div>

          {/* Color Palettes (Hidden in Eraser tool) */}
          <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${tool === 'eraser' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  color === c.value && tool !== 'eraser' ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* Size Slider (Disable in Fill Tool) */}
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-medium">Size:</span>
            <input
              type="range"
              min="2"
              max="20"
              disabled={tool === 'fill'}
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value))}
              className="w-20 accent-indigo-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <span className="text-white text-xs font-bold w-6">{brushWidth}px</span>
          </div>

          <button
            onClick={clearCanvas}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow-md active:scale-95 animate-pulse"
          >
            🗑️ Clear
          </button>
        </div>
      )}
    </div>
  );
}
