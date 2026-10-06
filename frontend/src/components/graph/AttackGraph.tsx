import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Shield,
  Server,
  Terminal,
  AlertTriangle,
  Crosshair,
  Maximize2
} from "lucide-react";
import type { GraphNode, GraphEdge } from "../../api/correlation";

interface AttackGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

export function AttackGraph({
  nodes: initialNodes,
  edges,
  height = 520,
  onNodeClick,
}: AttackGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Keep dimensions in state so we re-render and re-center when measured
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height,
  });

  // Simulation state: store physical simulation nodes in ref
  const simNodes = useRef<Map<string, { x: number; y: number; vx: number; vy: number; node: GraphNode }>>(
    new Map()
  );

  // ResizeObserver to track container width changes (such as modal opening transitions)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height || height);
        if (w > 0) {
          setCanvasDimensions((prev) => {
            if (prev.width !== w || prev.height !== h) {
              return { width: w, height: h };
            }
            return prev;
          });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [height]);

  // Initialize node positions in a radial topology around center
  useEffect(() => {
    if (initialNodes.length === 0) {
      simNodes.current.clear();
      return;
    }

    const map = new Map<string, { x: number; y: number; vx: number; vy: number; node: GraphNode }>();
    const total = initialNodes.length;
    const centerX = canvasDimensions.width / 2;
    const centerY = canvasDimensions.height / 2;
    const radius = Math.min(centerX, centerY) * 0.72;

    initialNodes.forEach((node, i) => {
      const existing = simNodes.current.get(node.id);
      if (existing) {
        map.set(node.id, { ...existing, node });
      } else {
        const angle = (i / Math.max(1, total)) * 2 * Math.PI;
        const dist = node.type === "incident" ? 0 : radius * (0.35 + 0.65 * ((i % 4) / 3));
        map.set(node.id, {
          x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 30,
          y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 30,
          vx: 0,
          vy: 0,
          node,
        });
      }
    });

    simNodes.current = map;
  }, [initialNodes, canvasDimensions]);

  // Center & auto-fit graph to view
  const autoFitView = useCallback(() => {
    const nodesArr = Array.from(simNodes.current.values());
    if (nodesArr.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodesArr.forEach((item) => {
      const r = item.node.size || 22;
      minX = Math.min(minX, item.x - r - 40);
      maxX = Math.max(maxX, item.x + r + 40);
      minY = Math.min(minY, item.y - r - 40);
      maxY = Math.max(maxY, item.y + r + 40);
    });

    const graphW = Math.max(100, maxX - minX);
    const graphH = Math.max(100, maxY - minY);
    const viewW = canvasDimensions.width;
    const viewH = canvasDimensions.height;

    const fitZoom = Math.max(0.4, Math.min(1.2, 0.85 / Math.max(graphW / viewW, graphH / viewH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(fitZoom);
    setPan({
      x: viewW / 2 - centerX * fitZoom,
      y: viewH / 2 - centerY * fitZoom,
    });
  }, [canvasDimensions]);

  // Draw function: renders background, edges, and nodes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasDimensions.width;
    const h = canvasDimensions.height;

    const targetW = Math.round(width * dpr);
    const targetH = Math.round(h * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);

    // Apply Pan and Zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Edges
    edges.forEach((edge) => {
      const src = simNodes.current.get(edge.source);
      const tgt = simNodes.current.get(edge.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Edge label
      if (edge.label && zoom > 0.65) {
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        ctx.font = "9px Inter, sans-serif";
        ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(edge.label, midX, midY - 6);
      }
    });

    // 2. Draw Nodes
    simNodes.current.forEach((item) => {
      const { x, y, node } = item;
      const isSelected = selectedNode?.id === node.id;
      const radius = node.size || 22;

      // Outer glow on selection
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.fill();
      }

      // Base node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color || "#38bdf8";
      ctx.shadowColor = node.color || "#38bdf8";
      ctx.shadowBlur = isSelected ? 18 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border ring
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Node label
      const safeLabel = String(node.label || node.id || "Entity");
      ctx.font = `${node.type === "incident" ? "bold 11px" : "10px"} Inter, sans-serif`;
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxLen = 16;
      const displayLabel = safeLabel.length > maxLen ? safeLabel.substring(0, maxLen) + "…" : safeLabel;
      ctx.fillText(displayLabel, x, y + radius + 14);

      // Subtext type badge
      const safeType = String(node.type || "").toUpperCase();
      ctx.font = "8px Inter, sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.fillText(safeType, x, y + radius + 25);
    });

    ctx.restore();
  }, [canvasDimensions, edges, pan, zoom, selectedNode]);

  // Simulation & continuous render loop
  useEffect(() => {
    let animId: number;
    let iteration = 0;
    const maxIterations = 280;

    const tick = () => {
      iteration++;
      const nodesArr = Array.from(simNodes.current.values());

      // Repulsion between nodes
      for (let i = 0; i < nodesArr.length; i++) {
        for (let j = i + 1; j < nodesArr.length; j++) {
          const a = nodesArr[i];
          const b = nodesArr[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = ((a.node.size || 22) + (b.node.size || 22)) * 2.8;

          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.08;
            if (draggingNodeId !== a.node.id) {
              a.vx -= dx * force;
              a.vy -= dy * force;
            }
            if (draggingNodeId !== b.node.id) {
              b.vx += dx * force;
              b.vy += dy * force;
            }
          }
        }
      }

      // Edge spring attraction
      edges.forEach((edge) => {
        const sourceNode = simNodes.current.get(edge.source);
        const targetNode = simNodes.current.get(edge.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = 120;
          const force = (dist - idealDist) * 0.003;

          if (draggingNodeId !== sourceNode.node.id) {
            sourceNode.vx += dx * force;
            sourceNode.vy += dy * force;
          }
          if (draggingNodeId !== targetNode.node.id) {
            targetNode.vx -= dx * force;
            targetNode.vy -= dy * force;
          }
        }
      });

      // Gravity pulling toward center
      const centerX = canvasDimensions.width / 2;
      const centerY = canvasDimensions.height / 2;

      nodesArr.forEach((item) => {
        if (draggingNodeId !== item.node.id) {
          item.vx += (centerX - item.x) * 0.0006;
          item.vy += (centerY - item.y) * 0.0006;

          item.x += item.vx;
          item.y += item.vy;
          item.vx *= 0.88;
          item.vy *= 0.88;
        }
      });

      // Redraw canvas with new coordinates
      draw();

      if (iteration < maxIterations || draggingNodeId) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [edges, canvasDimensions, draggingNodeId, draw]);

  // Handle canvas interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // Check if a node was clicked
    let clickedNode: GraphNode | null = null;
    simNodes.current.forEach((item) => {
      const dx = item.x - mouseX;
      const dy = item.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) <= (item.node.size || 22) + 6) {
        clickedNode = item.node;
      }
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDraggingNodeId((clickedNode as GraphNode).id);
      if (onNodeClick) onNodeClick(clickedNode);
    } else {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNodeId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      const nodeItem = simNodes.current.get(draggingNodeId);
      if (nodeItem) {
        nodeItem.x = mouseX;
        nodeItem.y = mouseY;
        nodeItem.vx = 0;
        nodeItem.vy = 0;
        draw();
      }
    } else if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.max(0.3, Math.min(2.8, prev * zoomFactor)));
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <Shield size={14} className="text-red-400" />;
      case "ip":
        return <Server size={14} className="text-cyan-400" />;
      case "process":
        return <Terminal size={14} className="text-emerald-400" />;
      case "ioc":
        return <AlertTriangle size={14} className="text-rose-400" />;
      case "mitre":
        return <Crosshair size={14} className="text-violet-400" />;
      default:
        return <Info size={14} className="text-purple-400" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl bg-[#070b14] border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col md:flex-row"
      style={{ minHeight: height }}
    >
      {/* Canvas Area */}
      <div className="relative flex-1 w-full" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1 bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg z-10">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.8, z * 1.2))}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={autoFitView}
            title="Auto-Fit / Re-Center"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Graph Legend */}
        <div className="absolute bottom-4 left-4 p-2.5 bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg text-[11px] text-slate-300 flex flex-wrap gap-3 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Incident
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Critical/High Alert
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Medium Alert
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> IP Address
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Process
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> MITRE ATT&CK
          </div>
        </div>
      </div>

      {/* Node Inspector Panel */}
      {selectedNode && (
        <div className="w-full md:w-80 p-5 bg-[#0b101d] border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.type)}
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  {selectedNode.type} Entity
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded bg-slate-800/60 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-100 break-words">{selectedNode.label}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{selectedNode.id}</p>
            </div>

            {selectedNode.degree !== undefined && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400">Connectivity Degree</span>
                <p className="text-base font-bold text-cyan-400">
                  {selectedNode.degree} <span className="text-xs text-slate-500 font-normal">connections</span>
                </p>
              </div>
            )}

            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400">Entity Attributes</span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto text-[11px]">
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex flex-col">
                      <span className="text-slate-500 font-mono text-[10px] uppercase">{k}</span>
                      <span className="text-slate-200 font-mono break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4">
            <span className="text-[10px] text-slate-500">
              Tip: Click and drag nodes to explore multi-hop pivots and cluster relations.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
