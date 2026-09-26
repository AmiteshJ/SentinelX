import React, { useRef, useEffect, useState, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Info, Shield, Server, Terminal, AlertTriangle, Crosshair, Globe, FileCode } from "lucide-react";
import type { GraphNode, GraphEdge } from "../../api/correlation";

interface AttackGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

export function AttackGraph({ nodes: initialNodes, edges, height = 520, onNodeClick }: AttackGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Simulation state
  const simNodes = useRef<Map<string, { x: number; y: number; vx: number; vy: number; node: GraphNode }>>(new Map());

  // Initialize nodes positions in a circle/radial layout
  useEffect(() => {
    const map = new Map<string, { x: number; y: number; vx: number; vy: number; node: GraphNode }>();
    const total = initialNodes.length;
    const centerX = 400;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.75;

    initialNodes.forEach((node, i) => {
      const existing = simNodes.current.get(node.id);
      if (existing) {
        map.set(node.id, { ...existing, node });
      } else {
        const angle = (i / Math.max(1, total)) * 2 * Math.PI;
        const dist = node.type === "incident" ? 0 : radius * (0.4 + 0.6 * ((i % 3) / 2));
        map.set(node.id, {
          x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
          y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          node
        });
      }
    });

    simNodes.current = map;
  }, [initialNodes, height]);

  // Force simulation loop
  useEffect(() => {
    let animId: number;
    let iteration = 0;

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
          const minDist = (a.node.size + b.node.size) * 2.8;

          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.08;
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

      // Center gravity
      const centerX = 400;
      const centerY = height / 2;
      nodesArr.forEach((item) => {
        if (draggingNodeId !== item.node.id) {
          item.vx += (centerX - item.x) * 0.0005;
          item.vy += (centerY - item.y) * 0.0005;

          // Apply velocity and damping
          item.x += item.vx;
          item.y += item.vy;
          item.vx *= 0.88;
          item.vy *= 0.88;
        }
      });

      // Render canvas
      draw();

      if (iteration < 240 || draggingNodeId) {
        animId = requestAnimationFrame(tick);
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const h = height;

      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
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
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Edge label
        if (edge.label && zoom > 0.8) {
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.font = "9px Inter, sans-serif";
          ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
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
        ctx.font = `${node.type === "incident" ? "bold 11px" : "10px"} Inter, sans-serif`;
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Truncate long labels
        const maxLen = 14;
        const displayLabel = node.label.length > maxLen ? node.label.substring(0, maxLen) + "…" : node.label;
        ctx.fillText(displayLabel, x, y + radius + 14);

        // Subtext type badge
        ctx.font = "8px Inter, sans-serif";
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.fillText(node.type.toUpperCase(), x, y + radius + 25);
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [edges, height, zoom, pan, selectedNode, draggingNodeId]);

  // Handle canvas interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicked a node
    let clickedNode: GraphNode | null = null;
    simNodes.current.forEach((item) => {
      const dx = item.x - mouseX;
      const dy = item.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) <= (item.node.size || 22) + 4) {
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
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev * zoomFactor)));
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "alert": return <Shield size={14} className="text-red-400" />;
      case "ip": return <Server size={14} className="text-cyan-400" />;
      case "process": return <Terminal size={14} className="text-emerald-400" />;
      case "ioc": return <AlertTriangle size={14} className="text-rose-400" />;
      case "mitre": return <Crosshair size={14} className="text-violet-400" />;
      default: return <Info size={14} className="text-purple-400" />;
    }
  };

  return (
    <div className="relative w-full rounded-2xl bg-[#070b14] border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Canvas Area */}
      <div className="relative flex-1" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1 bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg z-10">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="Reset View"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Graph Legend */}
        <div className="absolute bottom-4 left-4 p-2.5 bg-[#0f172a]/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg text-[11px] text-slate-300 flex flex-wrap gap-3 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Incident</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Critical/High Alert</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Medium Alert</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> IP Address</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Process</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> MITRE ATT&CK</div>
        </div>
      </div>

      {/* Node Inspector Panel */}
      {selectedNode && (
        <div className="w-full md:w-80 p-5 bg-[#0b101d] border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.type)}
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">{selectedNode.type} Entity</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded bg-slate-800/60"
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
                <p className="text-base font-bold text-cyan-400">{selectedNode.degree} <span className="text-xs text-slate-500 font-normal">connections</span></p>
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
            <span className="text-[10px] text-slate-500">Tip: Click and drag nodes to explore multi-hop pivots and cluster relations.</span>
          </div>
        </div>
      )}
    </div>
  );
}
