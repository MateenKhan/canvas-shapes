"use client";

import { useRef, useState, useEffect } from "react";
import Toolbar from "./Toolbar";

export type Tool = "pen" | "rect" | "circle" | "line" | "select";

// Consolidated shape types with ID
type BaseShape = {
  id: string;
};

type PenShape = BaseShape & {
  type: "pen";
  points: { x: number; y: number }[];
};

type RectShape = BaseShape & {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
};

type CircleShape = BaseShape & {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
};

type LineShape = BaseShape & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Shape = PenShape | RectShape | CircleShape | LineShape;

const GRID_SIZE = 20; // px grid

function snap(n: number) {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
  }, [showGrid, showAxes, zoom, pan, shapes, selectedShapeIds]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    drawGrid(ctx);
    drawAxes(ctx);
    redrawShapes(ctx);
    drawSelection(ctx);
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

  const drawSelection = (ctx: CanvasRenderingContext2D) => {
    if (selectedShapeIds.size === 0) return;
    
    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 / zoom;
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    
    for (const shape of shapes) {
      if (!selectedShapeIds.has(shape.id)) continue;
      
      let bounds = getShapeBounds(shape);
      if (!bounds) continue;
      
      // Draw selection box
      ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      
      // Draw resize handles
      const handleSize = 8 / zoom;
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(bounds.x - handleSize/2, bounds.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(bounds.x + bounds.w - handleSize/2, bounds.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(bounds.x - handleSize/2, bounds.y + bounds.h - handleSize/2, handleSize, handleSize);
      ctx.fillRect(bounds.x + bounds.w - handleSize/2, bounds.y + bounds.h - handleSize/2, handleSize, handleSize);
    }
    ctx.restore();
  };

  const getShapeBounds = (shape: Shape): { x: number, y: number, w: number, h: number } | null => {
    switch (shape.type) {
      case "pen":
        if (shape.points.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of shape.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      case "rect":
        return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
      case "circle":
        return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
      case "line":
        return { x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), 
                 w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) };
    }
  };

  const isPointInShape = (point: { x: number, y: number }, shape: Shape): boolean => {
    const hitThreshold = 10 / zoom;
    
    switch (shape.type) {
      case "pen":
        for (let i = 0; i < shape.points.length - 1; i++) {
          const p1 = shape.points[i];
          const p2 = shape.points[i + 1];
          if (distanceToSegment(point, p1, p2) < hitThreshold) return true;
        }
        return false;
      case "rect":
        return point.x >= shape.x && point.x <= shape.x + shape.w &&
               point.y >= shape.y && point.y <= shape.y + shape.h;
      case "circle":
        const dist = Math.hypot(point.x - shape.cx, point.y - shape.cy);
        return Math.abs(dist - shape.r) < hitThreshold || dist < shape.r;
      case "line":
        return distanceToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) < hitThreshold;
    }
  };

  const distanceToSegment = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length)));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
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
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const p = pos(e);

    if (tool === "select") {
      const clickedShape = shapes.findLast(shape => isPointInShape(p, shape));
      if (clickedShape) {
        if (e.shiftKey) {
          setSelectedShapeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clickedShape.id)) {
              newSet.delete(clickedShape.id);
            } else {
              newSet.add(clickedShape.id);
            }
            return newSet;
          });
        } else {
          setSelectedShapeIds(new Set([clickedShape.id]));
          setIsDragging(true);
          const bounds = getShapeBounds(clickedShape);
          if (bounds) {
            setDragOffset({ x: p.x - bounds.x, y: p.y - bounds.y });
          }
        }
      } else {
        setSelectedShapeIds(new Set());
      }
      return;
    }

    setIsDrawing(true);
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

    if (isDragging && tool === "select") {
      const p = pos(e);
      const deltaX = p.x - dragOffset.x;
      const deltaY = p.y - dragOffset.y;
      
      setShapes(prev => prev.map(shape => 
        selectedShapeIds.has(shape.id) ? moveShapeBy(shape, deltaX, deltaY) : shape
      ));
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
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      return;
    }

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

    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    
    const ctx = getCtx();
    if (!ctx) return;
    
    let newShape: Shape | null = null;
    const id = generateId();
    
    if (tool === "pen" && currentPenPoints.length > 1) {
      newShape = { id, type: "pen", points: currentPenPoints };
      setCurrentPenPoints([]);
    } else if (tool !== "pen" && tool !== "select") {
      const p = pos(e);
      const curr = { x: snap(p.x), y: snap(p.y) };
      
      switch (tool) {
        case "rect":
          newShape = { id, type: "rect", x: start.x, y: start.y, w: curr.x - start.x, h: curr.y - start.y };
          break;
        case "circle":
          newShape = { id, type: "circle", cx: start.x, cy: start.y, r: Math.hypot(curr.x - start.x, curr.y - start.y) };
          break;
        case "line":
          newShape = { id, type: "line", x1: start.x, y1: start.y, x2: curr.x, y2: curr.y };
          break;
      }
    }
    
    if (newShape) {
      setShapes(prev => [...prev, newShape!]);
    }
    
    ctx.closePath();
  };

  const moveShapeBy = (shape: Shape, deltaX: number, deltaY: number): Shape => {
    switch (shape.type) {
      case "pen":
        return { ...shape, points: shape.points.map(p => ({ x: p.x + deltaX, y: p.y + deltaY })) };
      case "rect":
        return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
      case "circle":
        return { ...shape, cx: shape.cx + deltaX, cy: shape.cy + deltaY };
      case "line":
        return { ...shape, x1: shape.x1 + deltaX, y1: shape.y1 + deltaY, x2: shape.x2 + deltaX, y2: shape.y2 + deltaY };
    }
  };

  /* ---------- svg import ---------- */
  const handleImportSVG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, "image/svg+xml");
    const svgElements = svgDoc.querySelectorAll("rect, circle, ellipse, line, polyline, polygon, path");
    
    const importedShapes: Shape[] = [];
    
    svgElements.forEach((el) => {
      const shape = parseSVGElement(el);
      if (shape) importedShapes.push(shape);
    });
    
    if (importedShapes.length > 0) {
      setShapes(prev => [...prev, ...importedShapes]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseSVGElement = (el: Element): Shape | null => {
    const id = generateId();
    
    try {
      switch (el.tagName.toLowerCase()) {
        case "rect":
          const rect = el as SVGRectElement;
          return {
            id,
            type: "rect",
            x: parseFloat(rect.getAttribute("x") || "0"),
            y: parseFloat(rect.getAttribute("y") || "0"),
            w: parseFloat(rect.getAttribute("width") || "0"),
            h: parseFloat(rect.getAttribute("height") || "0")
          };
        case "circle":
          const circle = el as SVGCircleElement;
          return {
            id,
            type: "circle",
            cx: parseFloat(circle.getAttribute("cx") || "0"),
            cy: parseFloat(circle.getAttribute("cy") || "0"),
            r: parseFloat(circle.getAttribute("r") || "0")
          };
        case "ellipse":
          const ellipse = el as SVGEllipseElement;
          const rx = parseFloat(ellipse.getAttribute("rx") || "0");
          const ry = parseFloat(ellipse.getAttribute("ry") || "0");
          return {
            id,
            type: "circle",
            cx: parseFloat(ellipse.getAttribute("cx") || "0"),
            cy: parseFloat(ellipse.getAttribute("cy") || "0"),
            r: (rx + ry) / 2
          };
        case "line":
          const line = el as SVGLineElement;
          return {
            id,
            type: "line",
            x1: parseFloat(line.getAttribute("x1") || "0"),
            y1: parseFloat(line.getAttribute("y1") || "0"),
            x2: parseFloat(line.getAttribute("x2") || "0"),
            y2: parseFloat(line.getAttribute("y2") || "0")
          };
        case "polyline":
        case "polygon":
          const poly = el as SVGPolylineElement;
          const pointsAttr = poly.getAttribute("points");
          if (!pointsAttr) return null;
          const points = parsePoints(pointsAttr);
          if (points.length < 2) return null;
          return { id, type: "pen", points };
        case "path":
          const path = el as SVGPathElement;
          const d = path.getAttribute("d");
          if (!d) return null;
          const pathPoints = parsePath(d);
          if (pathPoints.length < 2) return null;
          return { id, type: "pen", points: pathPoints };
        default:
          return null;
      }
    } catch (err) {
      console.warn("Failed to parse SVG element:", el, err);
      return null;
    }
  };

  const parsePoints = (pointsAttr: string): { x: number, y: number }[] => {
    const points = [];
    const tokens = pointsAttr.trim().split(/[\s,]+/);
    for (let i = 0; i < tokens.length; i += 2) {
      if (i + 1 < tokens.length) {
        points.push({ x: parseFloat(tokens[i]), y: parseFloat(tokens[i + 1]) });
      }
    }
    return points;
  };

  const parsePath = (d: string): { x: number, y: number }[] => {
    const points = [];
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [];
    const values = d.split(/[MmLlHhVvCcSsQqTtAaZz]/).filter(s => s.trim());
    
    let current = { x: 0, y: 0 };
    let i = 0;
    
    for (const cmd of commands) {
      const nums = (values[i] || "").trim().split(/[\s,]+/).filter(s => s).map(parseFloat);
      i++;
      
      switch (cmd) {
        case 'M':
        case 'm':
          if (nums.length >= 2) {
            current = cmd === 'm' ? { x: current.x + nums[0], y: current.y + nums[1] } : { x: nums[0], y: nums[1] };
            points.push(current);
          }
          break;
        case 'L':
        case 'l':
          if (nums.length >= 2) {
            current = cmd === 'l' ? { x: current.x + nums[0], y: current.y + nums[1] } : { x: nums[0], y: nums[1] };
            points.push(current);
          }
          break;
      }
    }
    return points;
  };

  /* ---------- keyboard delete ---------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedShapeIds.size > 0) {
        setShapes(prev => prev.filter(s => !selectedShapeIds.has(s.id)));
        setSelectedShapeIds(new Set());
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeIds]);

  /* ---------- render ---------- */
  return (
    <main className="flex h-screen bg-gray-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        onChange={handleImportSVG}
        className="hidden"
      />
      <Toolbar
        selected={tool}
        onSelect={(t) => {
          setTool(t);
          if (t !== "select") setSelectedShapeIds(new Set());
        }}
        showGrid={showGrid}
        toggleGrid={() => setShowGrid(g => !g)}
        showAxes={showAxes}
        toggleAxes={() => setShowAxes(a => !a)}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onImportSVG={() => fileInputRef.current?.click()}
        hasSelection={selectedShapeIds.size > 0}
        onDelete={() => {
          setShapes(prev => prev.filter(s => !selectedShapeIds.has(s.id)));
          setSelectedShapeIds(new Set());
        }}
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