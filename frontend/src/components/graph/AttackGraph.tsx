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
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Filter,
  Copy,
  Check,
  Zap,
  Radio,
  Share2,
  ExternalLink
} from "lucide-react";
import type { GraphNode, GraphEdge } from "../../api/correlation";

export interface AttackGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

interface SimNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: GraphNode;
}

export function AttackGraph({
  nodes: initialNodes,
  edges,
  height = 540,
  onNodeClick,
  selectedNodeId: controlledSelectedNodeId,
}: AttackGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  const [filterType, setFilterType] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlowAnimated, setIsFlowAnimated] = useState(true);
  const [flowSpeed, setFlowSpeed] = useState<number>(1.0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Dimensions
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height,
  });

  // Physical simulation map
  const simNodes = useRef<Map<string, SimNode>>(new Map());
  const hasAutoFitted = useRef<boolean>(false);
  const animFrameId = useRef<number | null>(null);

  // Sync external controlledSelectedNodeId
  useEffect(() => {
    if (controlledSelectedNodeId) {
      const target = initialNodes.find((n) => n.id === controlledSelectedNodeId);
      if (target) {
        setSelectedNode(target);
        // Focus view on target
        const sNode = simNodes.current.get(target.id);
        if (sNode) {
          setPan({
            x: canvasDimensions.width / 2 - sNode.x * zoom,
            y: canvasDimensions.height / 2 - sNode.y * zoom,
          });
        }
      }
    }
  }, [controlledSelectedNodeId, initialNodes, canvasDimensions, zoom]);

  // Track container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = isFullscreen ? window.innerHeight - 80 : Math.floor(entry.contentRect.height || height);
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
  }, [height, isFullscreen]);

  // Initialize node positions in structured multi-ring topology
  useEffect(() => {
    if (initialNodes.length === 0) {
      simNodes.current.clear();
      hasAutoFitted.current = false;
      return;
    }

    const map = new Map<string, SimNode>();
    const total = initialNodes.length;
    const centerX = canvasDimensions.width / 2;
    const centerY = canvasDimensions.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.75;

    // Categorize nodes into concentric layers:
    // Center: Incidents
    // Ring 1: High connectivity / Choke points / Critical alerts
    // Ring 2: IP addresses & hosts
    // Ring 3: MITRE ATT&CK techniques, processes, IOCs
    initialNodes.forEach((node, i) => {
      const existing = simNodes.current.get(node.id);
      if (existing) {
        map.set(node.id, { ...existing, node });
      } else {
        let dist = maxRadius * 0.55;
        if (node.type === "incident") {
          dist = maxRadius * 0.15;
        } else if (node.type === "alert") {
          dist = maxRadius * 0.42;
        } else if (node.type === "ip") {
          dist = maxRadius * 0.70;
        } else if (node.type === "process" || node.type === "mitre") {
          dist = maxRadius * 0.90;
        }

        const angle = (i / Math.max(1, total)) * 2 * Math.PI + (i % 2) * 0.3;
        map.set(node.id, {
          x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
          y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
          node,
        });
      }
    });

    simNodes.current = map;
    hasAutoFitted.current = false;
  }, [initialNodes, canvasDimensions]);

  // Auto-fit view calculation to center all nodes inside view
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
      const r = (item.node.size || 22) + 30;
      minX = Math.min(minX, item.x - r);
      maxX = Math.max(maxX, item.x + r);
      minY = Math.min(minY, item.y - r);
      maxY = Math.max(maxY, item.y + r);
    });

    const graphW = Math.max(120, maxX - minX);
    const graphH = Math.max(120, maxY - minY);
    const viewW = canvasDimensions.width;
    const viewH = canvasDimensions.height;

    // Calculate scale factor with safety padding
    const fitZoom = Math.max(0.35, Math.min(1.15, 0.82 / Math.max(graphW / viewW, graphH / viewH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(fitZoom);
    setPan({
      x: viewW / 2 - centerX * fitZoom,
      y: viewH / 2 - centerY * fitZoom,
    });
  }, [canvasDimensions]);

  // Center on a specific node
  const focusOnNode = useCallback(
    (nodeId: string) => {
      const item = simNodes.current.get(nodeId);
      if (!item) return;
      setSelectedNode(item.node);
      const targetZoom = Math.max(zoom, 1.0);
      setZoom(targetZoom);
      setPan({
        x: canvasDimensions.width / 2 - item.x * targetZoom,
        y: canvasDimensions.height / 2 - item.y * targetZoom,
      });
    },
    [canvasDimensions, zoom]
  );

  // Draw & continuous animated flow loop
  useEffect(() => {
    let animId: number;
    let simIteration = 0;
    const maxSimIterations = 200;

    const renderLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Handle high-DPI crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const width = canvasDimensions.width;
      const h = canvasDimensions.height;
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Physics relaxation step
      if (simIteration < maxSimIterations || draggingNodeId) {
        simIteration++;
        const nodesArr = Array.from(simNodes.current.values());

        // 1. Repulsion between entities
        for (let i = 0; i < nodesArr.length; i++) {
          for (let j = i + 1; j < nodesArr.length; j++) {
            const a = nodesArr[i];
            const b = nodesArr[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = ((a.node.size || 22) + (b.node.size || 22)) * 3.2;

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

        // 2. Edge attraction (Springs)
        edges.forEach((edge) => {
          const sourceNode = simNodes.current.get(edge.source);
          const targetNode = simNodes.current.get(edge.target);
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = 130;
            const force = (dist - idealDist) * 0.0035;

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

        // 3. Central gravity and damping
        const centerX = width / 2;
        const centerY = h / 2;

        nodesArr.forEach((item) => {
          if (draggingNodeId !== item.node.id) {
            item.vx += (centerX - item.x) * 0.0007;
            item.vy += (centerY - item.y) * 0.0007;

            item.x += item.vx;
            item.y += item.vy;
            item.vx *= 0.86;
            item.vy *= 0.86;
          }
        });

        // Auto-fit once positions settle on initial load
        if (simIteration === 35 && !hasAutoFitted.current && initialNodes.length > 0) {
          hasAutoFitted.current = true;
          autoFitView();
        }
      }

      // --- Canvas Render ---
      const isLight = document.documentElement.classList.contains("light");

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, h);

      // Cyber Grid Background
      const gridSpacing = 40 * zoom;
      const offsetX = (pan.x % gridSpacing + gridSpacing) % gridSpacing;
      const offsetY = (pan.y % gridSpacing + gridSpacing) % gridSpacing;

      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(40, 41, 55, 0.05)" : "rgba(56, 189, 248, 0.025)";
      ctx.lineWidth = 1;
      for (let x = offsetX; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = offsetY; y < h; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Pan & Zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const activeNode = selectedNode || hoveredNode;
      const timeSec = (timestamp * 0.001 * flowSpeed);

      // --- 1. Draw Edges with Directional Flow Animations ---
      edges.forEach((edge, edgeIdx) => {
        const src = simNodes.current.get(edge.source);
        const tgt = simNodes.current.get(edge.target);
        if (!src || !tgt) return;

        // Filtering by node type
        if (
          filterType !== "all" &&
          src.node.type !== filterType &&
          tgt.node.type !== filterType
        ) {
          return;
        }

        const isConnectedToActive =
          activeNode && (edge.source === activeNode.id || edge.target === activeNode.id);
        const isHoveredEdge = hoveredEdge?.id === edge.id || selectedEdge?.id === edge.id;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);

        // Edge Base Line
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (isConnectedToActive || isHoveredEdge) {
          ctx.strokeStyle = isLight ? "#0284c7" : "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 2.4;
          ctx.shadowColor = isLight ? "rgba(2, 132, 199, 0.3)" : "#38bdf8";
          ctx.shadowBlur = 10;
        } else {
          ctx.strokeStyle = isLight ? "rgba(74, 75, 94, 0.28)" : "rgba(148, 163, 184, 0.22)";
          ctx.lineWidth = 1.3;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Directional Chevron Arrow (pointing towards target)
        const arrowDist = Math.max(30, dist - (tgt.node.size || 22) - 12);
        const arrowX = src.x + Math.cos(angle) * arrowDist;
        const arrowY = src.y + Math.sin(angle) * arrowDist;
        const arrowSize = isConnectedToActive ? 7 : 5;

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - Math.cos(angle - Math.PI / 6) * arrowSize,
          arrowY - Math.sin(angle - Math.PI / 6) * arrowSize
        );
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - Math.cos(angle + Math.PI / 6) * arrowSize,
          arrowY - Math.sin(angle + Math.PI / 6) * arrowSize
        );
        ctx.strokeStyle = isConnectedToActive ? (isLight ? "#0284c7" : "#38bdf8") : (isLight ? "rgba(74, 75, 94, 0.55)" : "rgba(148, 163, 184, 0.45)");
        ctx.lineWidth = isConnectedToActive ? 2 : 1.2;
        ctx.stroke();

        // Edge label (drawn at mid-point)
        if (edge.label && (zoom > 0.65 || isConnectedToActive)) {
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.font = isConnectedToActive ? "bold 10px Inter, sans-serif" : "9px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Subtle pill behind label
          const textW = ctx.measureText(edge.label).width;
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(6, 11, 22, 0.85)";
          ctx.fillRect(midX - textW / 2 - 4, midY - 14, textW + 8, 14);

          ctx.fillStyle = isConnectedToActive ? (isLight ? "#0284c7" : "#38bdf8") : (isLight ? "#282937" : "rgba(148, 163, 184, 0.85)");
          ctx.fillText(edge.label, midX, midY - 7);
        }

        // --- ANIMATED FLOW PACKETS / PARTICLES ---
        if (isFlowAnimated) {
          // Flow speed and phase offset based on edge index
          const cycleDuration = isConnectedToActive ? 1.6 : 2.8;
          const packetOffset = ((timeSec / cycleDuration) + (edgeIdx * 0.23)) % 1.0;

          // Particle travels from Source -> Target
          const px = src.x + dx * packetOffset;
          const py = src.y + dy * packetOffset;

          // Distinct particle colors based on relation
          let particleColor = "#38bdf8"; // Default Cyan
          if (edge.relation?.includes("TRIGGER") || edge.relation?.includes("EXPLOIT")) {
            particleColor = "#f43f5e"; // Rose / Attack Trigger
          } else if (edge.relation?.includes("TARGET") || edge.relation?.includes("COMMUNICATE")) {
            particleColor = "#06b6d4"; // Cyan Traffic
          } else if (edge.relation?.includes("MAPS_TO") || edge.relation?.includes("ATT&CK")) {
            particleColor = "#a855f7"; // Violet MITRE
          } else if (edge.relation?.includes("EXECUTE")) {
            particleColor = "#10b981"; // Emerald Process
          }

          // Outer particle glow
          ctx.beginPath();
          ctx.arc(px, py, isConnectedToActive ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = particleColor;
          ctx.shadowColor = particleColor;
          ctx.shadowBlur = isConnectedToActive ? 14 : 7;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Trailing packet comet tail
          const tailLen = isConnectedToActive ? 18 : 10;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - Math.cos(angle) * tailLen, py - Math.sin(angle) * tailLen);
          ctx.strokeStyle = particleColor;
          ctx.lineWidth = isConnectedToActive ? 2.5 : 1.5;
          ctx.stroke();
        }
      });

      // --- 2. Draw Nodes with Pulsing Radar Beacons ---
      simNodes.current.forEach((item) => {
        const { x, y, node } = item;

        // Filter check
        if (filterType !== "all" && node.type !== filterType) {
          return;
        }

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isNeighbor =
          activeNode &&
          edges.some(
            (e) =>
              (e.source === activeNode.id && e.target === node.id) ||
              (e.target === activeNode.id && e.source === node.id)
          );

        const radius = node.size || 22;
        const isHighThreat =
          node.type === "incident" ||
          (node.metadata?.severity === "critical" || node.metadata?.severity === "high") ||
          (node.degree && node.degree >= 4);

        // Continuous Pulsating Sonar Beacon Ring for active threats & incidents
        if (isHighThreat || isSelected) {
          const pulseSpeed = isSelected ? 2.2 : 1.4;
          const pulseProgress = ((timeSec * pulseSpeed) + (item.x * 0.01)) % 1.0;
          const pulseRadius = radius + pulseProgress * 26;
          const pulseAlpha = Math.max(0, 1 - pulseProgress) * 0.45;

          ctx.beginPath();
          ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected
            ? `rgba(56, 189, 248, ${pulseAlpha})`
            : node.color
            ? `${node.color}${Math.floor(pulseAlpha * 255).toString(16).padStart(2, "0")}`
            : `rgba(239, 68, 68, ${pulseAlpha})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // Selection / Hover Outer Glow Ring
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 9, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Connected Neighbor highlight halo
        if (isNeighbor && !isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
          ctx.fill();
        }

        // Node Main Body Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color || "#38bdf8";
        ctx.shadowColor = node.color || "#38bdf8";
        ctx.shadowBlur = isSelected ? 22 : isHovered ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // White/Sleek Inner Border Ring
        ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Node Degree / Connection count badge (if degree > 1)
        if (node.degree && node.degree > 1) {
          const badgeX = x + radius * 0.7;
          const badgeY = y - radius * 0.7;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, 8.5, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? "#ffffff" : "#0c1424";
          ctx.fill();
          ctx.strokeStyle = isLight ? "#0284c7" : "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = "bold 9px Inter, sans-serif";
          ctx.fillStyle = isLight ? "#0284c7" : "#38bdf8";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(node.degree), badgeX, badgeY);
        }

        // Node Label Typography
        const safeLabel = String(node.label || node.id || "Entity");
        ctx.font = `${node.type === "incident" ? "bold 11px" : "10px"} Inter, sans-serif`;
        ctx.fillStyle = isSelected ? (isLight ? "#0284c7" : "#ffffff") : (isLight ? "#282937" : "#f1f5f9");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxLen = 17;
        const displayLabel = safeLabel.length > maxLen ? safeLabel.substring(0, maxLen) + "…" : safeLabel;

        // Label background pill for ultra readability
        const labelW = ctx.measureText(displayLabel).width;
        ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(6, 11, 22, 0.85)";
        ctx.fillRect(x - labelW / 2 - 4, y + radius + 7, labelW + 8, 14);

        ctx.fillStyle = isSelected ? (isLight ? "#0284c7" : "#38bdf8") : (isLight ? "#282937" : "#f1f5f9");
        ctx.fillText(displayLabel, x, y + radius + 14);

        // Subtext Type Badge
        const safeType = String(node.type || "").toUpperCase();
        ctx.font = "bold 8px Inter, sans-serif";
        ctx.fillStyle = isLight ? "#58565e" : "rgba(148, 163, 184, 0.85)";
        ctx.fillText(safeType, x, y + radius + 27);
      });

      ctx.restore();

      // Loop forever for fluid 60fps directional flow animation
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    animFrameId.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    canvasDimensions,
    edges,
    pan,
    zoom,
    selectedNode,
    hoveredNode,
    hoveredEdge,
    selectedEdge,
    filterType,
    isFlowAnimated,
    flowSpeed,
    draggingNodeId,
    initialNodes,
    autoFitView,
  ]);

  // Handle Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // 1. Check if a node was clicked
    let clickedNode: GraphNode | null = null;
    simNodes.current.forEach((item) => {
      const dx = item.x - mouseX;
      const dy = item.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) <= (item.node.size || 22) + 8) {
        clickedNode = item.node;
      }
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setSelectedEdge(null);
      setDraggingNodeId((clickedNode as GraphNode).id);
      if (onNodeClick) onNodeClick(clickedNode);
      return;
    }

    // 2. Check if an edge was clicked
    let clickedEdge: GraphEdge | null = null;
    edges.forEach((edge) => {
      const src = simNodes.current.get(edge.source);
      const tgt = simNodes.current.get(edge.target);
      if (!src || !tgt) return;

      // Distance from point (mouseX, mouseY) to line segment (src, tgt)
      const l2 = (tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2;
      if (l2 === 0) return;
      let t = ((mouseX - src.x) * (tgt.x - src.x) + (mouseY - src.y) * (tgt.y - src.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = src.x + t * (tgt.x - src.x);
      const projY = src.y + t * (tgt.y - src.y);
      const dist = Math.sqrt((mouseX - projX) ** 2 + (mouseY - projY) ** 2);

      if (dist <= 8) {
        clickedEdge = edge;
      }
    });

    if (clickedEdge) {
      setSelectedEdge(clickedEdge);
      return;
    }

    // Empty canvas click: Drag pan
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    if (draggingNodeId) {
      const nodeItem = simNodes.current.get(draggingNodeId);
      if (nodeItem) {
        nodeItem.x = mouseX;
        nodeItem.y = mouseY;
        nodeItem.vx = 0;
        nodeItem.vy = 0;
      }
      return;
    }

    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Hover detection
    let foundNode: GraphNode | null = null;
    simNodes.current.forEach((item) => {
      const dx = item.x - mouseX;
      const dy = item.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) <= (item.node.size || 22) + 6) {
        foundNode = item.node;
      }
    });

    setHoveredNode(foundNode);

    if (!foundNode) {
      let foundEdge: GraphEdge | null = null;
      edges.forEach((edge) => {
        const src = simNodes.current.get(edge.source);
        const tgt = simNodes.current.get(edge.target);
        if (!src || !tgt) return;
        const l2 = (tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2;
        if (l2 === 0) return;
        let t = ((mouseX - src.x) * (tgt.x - src.x) + (mouseY - src.y) * (tgt.y - src.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = src.x + t * (tgt.x - src.x);
        const projY = src.y + t * (tgt.y - src.y);
        const dist = Math.sqrt((mouseX - projX) ** 2 + (mouseY - projY) ** 2);
        if (dist <= 7) foundEdge = edge;
      });
      setHoveredEdge(foundEdge);
    } else {
      setHoveredEdge(null);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.86;
    setZoom((prev) => Math.max(0.28, Math.min(3.2, prev * zoomFactor)));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <Shield size={15} className="text-red-400" />;
      case "ip":
        return <Server size={15} className="text-cyan-400" />;
      case "process":
        return <Terminal size={15} className="text-emerald-400" />;
      case "ioc":
        return <AlertTriangle size={15} className="text-rose-400" />;
      case "mitre":
        return <Crosshair size={15} className="text-violet-400" />;
      default:
        return <Info size={15} className="text-purple-400" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-[#fff5e6] dark:bg-[#050914] border border-[#e2d9cc] dark:border-slate-800/90 overflow-hidden shadow-sm dark:shadow-2xl flex flex-col md:flex-row transition-all ${
        isFullscreen ? "fixed inset-3 z-50 rounded-3xl border-cyan-500/40 shadow-[0_0_100px_rgba(0,0,0,0.95)]" : ""
      }`}
      style={{ minHeight: isFullscreen ? "calc(100vh - 24px)" : height }}
    >
      {/* Canvas Area */}
      <div className="relative flex-1 w-full" style={{ height: isFullscreen ? "calc(100vh - 24px)" : height }}>
        <canvas
          ref={canvasRef}
          className={`w-full h-full block ${
            hoveredNode || hoveredEdge ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Top-Left: Viewport & Flow Animation Controls */}
        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-1.5 p-1.5 bg-white/95 dark:bg-[#0a101f]/90 backdrop-blur-md rounded-2xl border border-[#e2d9cc] dark:border-slate-700/70 shadow-md z-10">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.2, z * 1.2))}
            title="Zoom In"
            className="p-1.5 text-[#58565e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-[#f8f4ec] dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.28, z * 0.8))}
            title="Zoom Out"
            className="p-1.5 text-[#58565e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-[#f8f4ec] dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={autoFitView}
            title="Auto-Fit / Re-Center Graph"
            className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/15 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
          <div className="h-4 w-px bg-[#e2d9cc] dark:bg-slate-700/60 mx-0.5" />
          <button
            type="button"
            onClick={() => setIsFlowAnimated(!isFlowAnimated)}
            title={isFlowAnimated ? "Pause Attack Flow Animation" : "Resume Attack Flow Animation"}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              isFlowAnimated
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25"
                : "text-[#58565e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-[#f8f4ec] dark:hover:bg-slate-800"
            }`}
          >
            {isFlowAnimated ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
            className="p-1.5 text-[#58565e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-[#f8f4ec] dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Top-Right: Entity Filter Chips */}
        <div className="absolute top-4 right-4 hidden sm:flex items-center gap-1 p-1 bg-white/95 dark:bg-[#0a101f]/90 backdrop-blur-md rounded-2xl border border-[#e2d9cc] dark:border-slate-700/70 shadow-md z-10">
          {[
            { id: "all", label: "All" },
            { id: "incident", label: "Incidents" },
            { id: "alert", label: "Alerts" },
            { id: "ip", label: "IPs" },
            { id: "process", label: "Processes" },
            { id: "mitre", label: "MITRE" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                filterType === tab.id
                  ? "bg-[#fa8775] dark:bg-cyan-500 text-white dark:text-black shadow-xs font-bold"
                  : "text-[#4a4b5e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-[#f8f4ec] dark:hover:bg-slate-800/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bottom-Left: Graph Flow & Node Legend */}
        <div className="absolute bottom-4 left-4 p-2.5 bg-white/95 dark:bg-[#0a101f]/90 backdrop-blur-md rounded-2xl border border-[#e2d9cc] dark:border-slate-700/70 shadow-md text-[11px] text-[#4a4b5e] dark:text-slate-300 flex flex-wrap items-center gap-3.5 z-10">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider pr-2 border-r border-[#e2d9cc] dark:border-slate-800">
            <Radio size={12} className="animate-pulse" />
            <span>Attack Vector Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] ring-2 ring-purple-500/30" /> Incident Hub
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] ring-2 ring-red-500/30" /> Critical/High Alert
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] ring-2 ring-cyan-500/30" /> IP Address
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-emerald-500/30" /> Process
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] ring-2 ring-violet-500/30" /> MITRE ATT&CK
          </div>
        </div>
      </div>

      {/* Interactive Entity Inspector Drawer (Clickable Node Details) */}
      {selectedNode && (
        <div className="w-full md:w-84 p-5 bg-white dark:bg-[#080d1a] border-t md:border-t-0 md:border-l border-[#e2d9cc] dark:border-slate-800/90 flex flex-col justify-between overflow-y-auto max-h-[560px] md:max-h-none shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e2d9cc] dark:border-slate-800">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.type)}
                <span className="text-xs uppercase font-bold tracking-wider text-[#282937] dark:text-slate-300">
                  {selectedNode.type} Entity Detail
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-[#58565e] hover:text-[#282937] dark:text-slate-500 dark:hover:text-slate-200 text-xs px-2.5 py-1 rounded-xl bg-[#f8f4ec] dark:bg-slate-800/70 hover:bg-[#ede6d9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-[#282937] dark:text-slate-100 break-words">{selectedNode.label}</h3>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedNode.label, "title")}
                  title="Copy Entity Value"
                  className="p-1 rounded-lg border border-[#e2d9cc] dark:border-slate-700 bg-white dark:bg-slate-800/60 text-[#58565e] hover:text-[#282937] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedId === "title" ? <Check size={12} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-[11px] text-[#58565e] dark:text-slate-500 mt-1 font-mono break-all">{selectedNode.id}</p>
            </div>

            {/* Connectivity Degree & Centrality */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-[#fefbf4] dark:bg-slate-900/80 border border-[#e2d9cc] dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-[#58565e] dark:text-slate-400 uppercase tracking-wider block font-mono">Degree</span>
                <p className="text-base font-bold text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {selectedNode.degree ?? 1} <span className="text-xs text-[#58565e] dark:text-slate-500 font-normal">links</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#fefbf4] dark:bg-slate-900/80 border border-[#e2d9cc] dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-[#58565e] dark:text-slate-400 uppercase tracking-wider block font-mono">Classification</span>
                <p className="text-xs font-bold text-[#282937] dark:text-slate-200 mt-1 uppercase truncate">
                  {selectedNode.metadata?.severity || selectedNode.type}
                </p>
              </div>
            </div>

            {/* Quick Actions for clicked entity */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => focusOnNode(selectedNode.id)}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-100 dark:hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Crosshair size={13} />
                <span>Center in View</span>
              </button>
            </div>

            {/* Metadata / Attributes */}
            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="text-[11px] font-semibold text-[#58565e] dark:text-slate-400 block uppercase tracking-wider">
                  Entity Attributes &amp; Correlation
                </span>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-[11px]">
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-xl bg-[#fefbf4] dark:bg-slate-900/60 border border-[#e2d9cc] dark:border-slate-800/80 flex flex-col shadow-xs">
                      <span className="text-[#58565e] dark:text-slate-500 font-mono text-[9px] uppercase tracking-wider">{k}</span>
                      <span className="text-[#282937] dark:text-slate-200 font-mono break-all mt-0.5">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e2d9cc] dark:border-slate-800/80 mt-4">
            <span className="text-[11px] text-[#58565e] dark:text-slate-400 flex items-center gap-1.5">
              <Share2 size={12} className="text-cyan-600 dark:text-cyan-400" />
              <span>Animated pulses visualize direction of attack propagation.</span>
            </span>
          </div>
        </div>
      )}

      {/* Selected Edge Inspector (if an edge was clicked) */}
      {!selectedNode && selectedEdge && (
        <div className="w-full md:w-80 p-5 bg-[#080d1a] border-t md:border-t-0 md:border-l border-slate-800/90 flex flex-col justify-between overflow-y-auto shadow-2xl">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-cyan-400" />
                <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                  Attack Relation Link
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEdge(null)}
                className="text-slate-500 hover:text-slate-200 text-xs px-2.5 py-1 rounded-xl bg-slate-800/70 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Relation Vector</span>
              <h3 className="text-sm font-bold text-cyan-300 mt-1">{selectedEdge.relation}</h3>
              {selectedEdge.label && (
                <p className="text-xs text-slate-300 mt-0.5">{selectedEdge.label}</p>
              )}
            </div>

            <div className="mt-3.5 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Source Origin</span>
                <span className="font-mono text-slate-200 break-all">{selectedEdge.source}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Destination Target</span>
                <span className="font-mono text-slate-200 break-all">{selectedEdge.target}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500">
            Click on any entity node to inspect its specific multi-hop connections.
          </div>
        </div>
      )}
    </div>
  );
}
