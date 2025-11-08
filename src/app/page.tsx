"use client";

import { useRef, useState, useEffect } from "react";
import Toolbar from "./Toolbar";

export type Tool = "pen" | "rect" | "circle" | "line";

const GRID_SIZE = 20; // px grid

function snap(n: number) {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  /* ---------- canvas init + grid + axes ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawCanvas(ctx);
    };
    
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [showGrid, showAxes, zoom, pan]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    drawGrid(ctx);
    drawAxes(ctx);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    if (!showGrid) return;
    ctx.save();
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, ctx.canvas.width / zoom, ctx.canvas.height / zoom);
    ctx.fillStyle = "#d1d5db";
    const dotSize = 2 / zoom;
    for (let x = 0; x <= ctx.canvas.width / zoom; x += GRID_SIZE) {
      for (let y = 0; y <= ctx.canvas.height / zoom; y += GRID_SIZE) {
        ctx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
      }
    }
    ctx.restore();
  };

  const drawAxes = (ctx: CanvasRenderingContext2D) => {
    if (!showAxes) return;
    ctx.save();
    
    const width = ctx.canvas.width / zoom;
    const height = ctx.canvas.height / zoom;
    const arrowSize = 10 / zoom;
    const tickSize = 5 / zoom;
    const labelOffset = 20 / zoom;
    
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2 / zoom;
    ctx.fillStyle = "#dc2626";
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.textAlign = "center";
    
    // Draw Y-axis (vertical)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    
    // Draw X-axis (horizontal)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();
    
    // Draw arrows
    ctx.beginPath();
    ctx.moveTo(-arrowSize/2, 0);
    ctx.lineTo(arrowSize/2, 0);
    ctx.lineTo(0, -arrowSize);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(width, arrowSize/2);
    ctx.lineTo(width, -arrowSize/2);
    ctx.lineTo(width + arrowSize, 0);
    ctx.closePath();
    ctx.fill();
    
    // Draw ticks and labels every 100px
    const tickInterval = 100;
    
    // X-axis ticks
    for (let x = 0; x <= width; x += tickInterval) {
      if (x === 0) continue;
      ctx.beginPath();
      ctx.moveTo(x, -tickSize);
      ctx.lineTo(x, tickSize);
      ctx.stroke();
      ctx.fillText(x.toString(), x, labelOffset);
    }
    
    // Y-axis ticks
    ctx.textAlign = "right";
    for (let y = tickInterval; y <= height; y += tickInterval) {
      ctx.beginPath();
      ctx.moveTo(-tickSize, y);
      ctx.lineTo(tickSize, y);
      ctx.stroke();
      ctx.fillText(y.toString(), -labelOffset, y + 4 / zoom);
    }
    
    // Origin label
    ctx.fillText("(0,0)", -labelOffset, -labelOffset/2);
    
    ctx.restore();
  };

  /* ---------- helpers ---------- */
  const getCtx = () => canvasRef.current?.getContext("2d");
  
  // Convert mouse event to world coordinates (accounting for zoom and pan)
  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const x = (canvasX - pan.x) / zoom;
    const y = (canvasY - pan.y) / zoom;
    return { x, y };
  };

  /* ---------- zoom controls ---------- */
  const handleZoomIn = () => setZoom(z => Math.min(parseFloat((z * 1.2).toFixed(2)), 5));
  const handleZoomOut = () => setZoom(z => Math.max(parseFloat((z / 1.2).toFixed(2)), 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  /* ---------- mouse wheel zoom ---------- */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get mouse position in canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Calculate world coordinates before zoom
    const worldX = (canvasX - pan.x) / zoom;
    const worldY = (canvasY - pan.y) / zoom;
    
    // Calculate new zoom level
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(parseFloat((zoom * delta).toFixed(2)), 0.1), 5);
    
    // Calculate new pan to keep the mouse point stable
    const newPanX = canvasX - worldX * newZoom;
    const newPanY = canvasY - worldY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  /* ---------- mouse handlers ---------- */
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const p = pos(e);
    const s = { x: snap(p.x), y: snap(p.y) };
    setStart(s);
    const ctx = getCtx();
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    if (tool === "pen") ctx.moveTo(s.x, s.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const p = pos(e);
    const curr = { x: snap(p.x), y: snap(p.y) };

    if (tool === "pen") {
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      return;
    }

    // Preview shape while dragging
    const canvas = canvasRef.current!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    drawGrid(ctx);
    drawAxes(ctx);
    
    ctx.beginPath();
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2 / zoom;

    switch (tool) {
      case "rect":
        ctx.rect(start.x, start.y, curr.x - start.x, curr.y - start.y);
        break;
      case "circle":
        const r = Math.hypot(curr.x - start.x, curr.y - start.y);
        ctx.arc(start.x, start.y, r, 0, 2 * Math.PI);
        break;
      case "line":
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(curr.x, curr.y);
        break;
    }
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = getCtx();
    ctx?.closePath();
  };

  /* ---------- render ---------- */
  return (
    <main className="flex h-screen bg-gray-100">
      <Toolbar
        selected={tool}
        onSelect={setTool}
        showGrid={showGrid}
        toggleGrid={() => setShowGrid(g => !g)}
        showAxes={showAxes}
        toggleAxes={() => setShowAxes(a => !a)}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onWheel={handleWheel}
          className="bg-white cursor-crosshair block"
        />
      </div>
    </main>
  );
}