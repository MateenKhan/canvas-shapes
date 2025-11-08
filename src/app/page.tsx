"use client";

import { useRef, useState, useEffect } from "react";
import Toolbar from "./Toolbar";

export type Tool = "pen" | "rect" | "circle" | "line";

type Shape =
  | { type: "pen"; points: { x: number; y: number }[] }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number };

const GRID_SIZE = 20; // px grid

function snap(n: number) {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  /* ---------- canvas init + redraw ---------- */
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
  }, [showGrid, showAxes, zoom, pan, shapes]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    drawGrid(ctx);
    drawAxes(ctx);
    redrawShapes(ctx);
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
    
    // Axes
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();
    
    // Arrows
    ctx.beginPath(); ctx.moveTo(-arrowSize/2, 0);
    ctx.lineTo(arrowSize/2, 0); ctx.lineTo(0, -arrowSize); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(width, arrowSize/2);
    ctx.lineTo(width, -arrowSize/2); ctx.lineTo(width + arrowSize, 0); ctx.closePath(); ctx.fill();
    
    // Ticks & labels every 100px
    const tickInterval = 100;
    for (let x = tickInterval; x <= width; x += tickInterval) {
      ctx.beginPath(); ctx.moveTo(x, -tickSize); ctx.lineTo(x, tickSize); ctx.stroke();
      ctx.fillText(x.toString(), x, labelOffset);
    }
    ctx.textAlign = "right";
    for (let y = tickInterval; y <= height; y += tickInterval) {
      ctx.beginPath(); ctx.moveTo(-tickSize, y); ctx.lineTo(tickSize, y); ctx.stroke();
      ctx.fillText(y.toString(), -labelOffset, y + 4 / zoom);
    }
    ctx.fillText("(0,0)", -labelOffset, -labelOffset/2);
    
    ctx.restore();
  };

  const redrawShapes = (ctx: CanvasRenderingContext2D) => {
    if (shapes.length === 0) return;
    ctx.save();
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2 / zoom;
    
    for (const shape of shapes) {
      ctx.beginPath();
      switch (shape.type) {
        case "pen":
          if (shape.points.length > 0) {
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (const p of shape.points) ctx.lineTo(p.x, p.y);
          }
          break;
        case "rect":
          ctx.rect(shape.x, shape.y, shape.w, shape.h);
          break;
        case "circle":
          ctx.arc(shape.cx, shape.cy, shape.r, 0, 2 * Math.PI);
          break;
        case "line":
          ctx.moveTo(shape.x1, shape.y1);
          ctx.lineTo(shape.x2, shape.y2);
          break;
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------- helpers ---------- */
  const getCtx = () => canvasRef.current?.getContext("2d");
  
  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    return { x: (canvasX - pan.x) / zoom, y: (canvasY - pan.y) / zoom };
  };

  /* ---------- zoom & pan controls ---------- */
  const handleZoomIn = () => setZoom(z => Math.min(parseFloat((z * 1.2).toFixed(2)), 5));
  const handleZoomOut = () => setZoom(z => Math.max(parseFloat((z / 1.2).toFixed(2)), 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldX = (canvasX - pan.x) / zoom;
    const worldY = (canvasY - pan.y) / zoom;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(parseFloat((zoom * delta).toFixed(2)), 0.1), 5);
    
    const newPanX = canvasX - worldX * newZoom;
    const newPanY = canvasY - worldY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  /* ---------- mouse handlers ---------- */
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Start panning with middle button or spacebar+left button
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    setIsDrawing(true);
    const p = pos(e);
    const s = { x: snap(p.x), y: snap(p.y) };
    setStart(s);
    
    if (tool === "pen") {
      setCurrentPenPoints([s]);
    }
    
    const ctx = getCtx();
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    if (tool === "pen") ctx.moveTo(s.x, s.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const p = pos(e);
    const curr = { x: snap(p.x), y: snap(p.y) };

    if (tool === "pen") {
      const newPoints = [...currentPenPoints, curr];
      setCurrentPenPoints(newPoints);
      
      // Draw the growing path
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      return;
    }

    // Clear and redraw everything for shape preview
    const canvas = canvasRef.current!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    drawGrid(ctx);
    drawAxes(ctx);
    redrawShapes(ctx);
    
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

  const endDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    
    const ctx = getCtx();
    if (!ctx) return;
    
    // Commit shape to history
    let newShape: Shape | null = null;
    
    if (tool === "pen" && currentPenPoints.length > 1) {
      newShape = { type: "pen", points: currentPenPoints };
      setCurrentPenPoints([]);
    } else if (tool !== "pen") {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const p = pos(e);
      const curr = { x: snap(p.x), y: snap(p.y) };
      
      switch (tool) {
        case "rect":
          newShape = { type: "rect", x: start.x, y: start.y, w: curr.x - start.x, h: curr.y - start.y };
          break;
        case "circle":
          newShape = { type: "circle", cx: start.x, cy: start.y, r: Math.hypot(curr.x - start.x, curr.y - start.y) };
          break;
        case "line":
          newShape = { type: "line", x1: start.x, y1: start.y, x2: curr.x, y2: curr.y };
          break;
      }
    }
    
    if (newShape) {
      setShapes(prev => [...prev, newShape!]);
    }
    
    ctx.closePath();
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
          className="bg-white cursor-crosshair block select-none"
        />
      </div>
    </main>
  );
}