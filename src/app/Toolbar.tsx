"use client";

import { Tool } from "./page";

const tools: { key: Tool; label: string; icon: string }[] = [
  { key: "pen", label: "Pen", icon: "✏️" },
  { key: "rect", label: "Rectangle", icon: "⬜" },
  { key: "circle", label: "Circle", icon: "⭕" },
  { key: "line", label: "Line", icon: "📏" },
];

export default function Toolbar({
  selected,
  onSelect,
  showGrid,
  toggleGrid,
  showAxes,
  toggleAxes,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: {
  selected: Tool;
  onSelect: (t: Tool) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  showAxes: boolean;
  toggleAxes: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}) {
  return (
    <aside className="w-20 bg-gray-800 text-white flex flex-col items-center py-4 space-y-4">
      {tools.map((t) => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          title={t.label}
          className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl transition ${
            selected === t.key
              ? "bg-blue-600 shadow-lg"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          {t.icon}
        </button>
      ))}

      {/* Grid toggle */}
      <button
        onClick={toggleGrid}
        title="Toggle grid"
        className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl transition mt-auto ${
          showGrid ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        #
      </button>

      {/* Axes toggle */}
      <button
        onClick={toggleAxes}
        title="Toggle axes"
        className={`w-14 h-14 rounded-lg flex items-center justify-center text-xl transition ${
          showAxes ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        ⟁
      </button>

      {/* Zoom controls */}
      <div className="flex flex-col items-center space-y-2 mt-2">
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="w-14 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-lg transition"
        >
          +
        </button>
        <div className="text-xs text-gray-300">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="w-14 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-lg transition"
        >
          −
        </button>
        <button
          onClick={onZoomReset}
          title="Reset Zoom"
          className="w-14 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-xs transition"
        >
          Reset
        </button>
      </div>
    </aside>
  );
}