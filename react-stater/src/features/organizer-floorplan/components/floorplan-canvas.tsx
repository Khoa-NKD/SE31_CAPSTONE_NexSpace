import React, { useRef, useState } from 'react';
import {
  Compass,
  Copy,
  Trash2,
  RotateCw,
  Coffee,
  Tv,
  DoorOpen,
  ArrowUpDown,
  Navigation
} from 'lucide-react';
import { FloorplanNode, ZoneBoundary, AssetTemplate, FloorplanTool } from '../types';

interface FloorplanCanvasProps {
  nodes: FloorplanNode[];
  zones: ZoneBoundary[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onRotateNode: (id: string, degrees: number) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDropNewAsset: (template: AssetTemplate, x: number, y: number) => void;
  zoom: number;
  snapToGrid: boolean;
  activeTool: FloorplanTool;
  isGridVisible: boolean;
}

function handleDragOver(e: React.DragEvent) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

export function FloorplanCanvas({
  nodes,
  zones,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onRotateNode,
  onDuplicateNode,
  onDeleteNode,
  onDropNewAsset,
  zoom,
  snapToGrid,
  activeTool,
  isGridVisible
}: FloorplanCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Handle Dragging an existing node on canvas
  const handleNodeMouseDown = (e: React.MouseEvent, node: FloorplanNode) => {
    if (activeTool === 'pan') return;
    e.stopPropagation();
    onSelectNode(node.id);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const scale = zoom / 100;
    const clientX = (e.clientX - canvasRect.left) / scale;
    const clientY = (e.clientY - canvasRect.top) / scale;

    const offsetX = clientX - node.x;
    const offsetY = clientY - node.y;

    setDraggingNodeId(node.id);

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let newX = (moveEvent.clientX - rect.left) / scale - offsetX;
      let newY = (moveEvent.clientY - rect.top) / scale - offsetY;

      if (snapToGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      // Constrain within blueprint frame (width: 880, height: 600)
      newX = Math.max(10, Math.min(800, newX));
      newY = Math.max(10, Math.min(540, newY));

      onUpdateNodePosition(node.id, newX, newY);
    };

    const handleWindowMouseUp = () => {
      setDraggingNodeId(null);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data || !canvasRef.current) return;

    try {
      const template = JSON.parse(data) as AssetTemplate;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = zoom / 100;

      let dropX = (e.clientX - canvasRect.left) / scale - template.defaultWidth / 2;
      let dropY = (e.clientY - canvasRect.top) / scale - template.defaultHeight / 2;

      if (snapToGrid) {
        dropX = Math.round(dropX / 10) * 10;
        dropY = Math.round(dropY / 10) * 10;
      }

      onDropNewAsset(template, Math.max(20, dropX), Math.max(20, dropY));
    } catch {
      // Invalid drag payload
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className={`flex-1 relative overflow-auto bg-muted/25 flex items-center justify-center p-8 select-none transition-all ${
        activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      <button
        type="button"
        aria-label="Clear node selection"
        className="absolute inset-0 w-full h-full cursor-default bg-transparent z-0 border-0 outline-none"
        onClick={() => onSelectNode(null)}
      />
      {/* Zoomable Container */}
      <div
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: '880px',
          height: '600px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
          transition: draggingNodeId ? 'none' : 'transform 0.15s ease-out'
        }}
        className={`relative rounded-xl border-2 border-border bg-card shadow-xl shrink-0 overflow-hidden ${
          isGridVisible ? 'bg-dot-grid' : ''
        }`}
      >
        {/* Subtle CSS Dot-Grid Pattern */}
        {isGridVisible && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />
        )}

        {/* Blueprint Framing & Architectural Markings */}
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] font-mono font-medium text-muted-foreground/80 tracking-wide uppercase bg-muted/80 px-2 py-0.5 rounded border border-border/50">
            DIM: 48.0m × 32.0m | 1,536 m²
          </span>
        </div>

        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none bg-muted/80 px-2 py-0.5 rounded border border-border/50">
          <Compass className="w-3.5 h-3.5 text-primary animate-spin-slow" />
          <span className="text-[10px] font-mono font-medium text-muted-foreground/80 tracking-wider">
            NORTH ↑
          </span>
        </div>

        <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] font-mono text-muted-foreground/70">
            SCALE: 1:50 | GRID: {snapToGrid ? '0.5m (SNAPPING ON)' : 'OFF'}
          </span>
        </div>

        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            FIRE EXIT EGRESS CLEAR
          </span>
        </div>

        {/* Architectural Structural Core (Elevators & Stairwell) */}
        <div
          style={{ left: '360px', top: '16px', width: '160px', height: '68px' }}
          className="absolute rounded-md border-2 border-border/80 bg-muted/70 flex flex-col p-1.5 justify-between pointer-events-none shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-1">
            <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-2.5 h-2.5" /> Core Shaft
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">E-CORE 01</span>
          </div>
          <div className="grid grid-cols-3 gap-1 h-8">
            <div className="border border-border/80 bg-background/80 rounded flex items-center justify-center text-[8px] font-mono font-semibold text-muted-foreground relative overflow-hidden">
              <span className="relative z-10">LIFT 01</span>
              <div className="absolute inset-0 border-t border-b border-border/40 rotate-45 transform scale-150 pointer-events-none opacity-40" />
            </div>
            <div className="border border-border/80 bg-background/80 rounded flex items-center justify-center text-[8px] font-mono font-semibold text-muted-foreground relative overflow-hidden">
              <span className="relative z-10">LIFT 02</span>
              <div className="absolute inset-0 border-t border-b border-border/40 rotate-45 transform scale-150 pointer-events-none opacity-40" />
            </div>
            <div className="border border-border/80 bg-background/80 rounded flex items-center justify-center text-[8px] font-mono font-semibold text-muted-foreground flex-col">
              <Navigation className="w-2.5 h-2.5 text-muted-foreground mb-0.5" />
              <span>STAIR B</span>
            </div>
          </div>
        </div>

        {/* Zones Boundaries */}
        {zones.map((zone) => {
          let zoneClasses = 'border-border/60 bg-muted/10';
          let tagClasses = 'bg-muted text-muted-foreground';

          if (zone.colorTheme === 'blue') {
            zoneClasses = 'border-blue-500/30 bg-blue-500/[0.03]';
            tagClasses = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
          } else if (zone.colorTheme === 'amber') {
            zoneClasses = 'border-amber-500/30 bg-amber-500/[0.03]';
            tagClasses = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
          }

          return (
            <div
              key={zone.id}
              style={{
                left: `${zone.x}px`,
                top: `${zone.y}px`,
                width: `${zone.width}px`,
                height: `${zone.height}px`
              }}
              className={`absolute rounded-xl border border-dashed p-3 pointer-events-none ${zoneClasses} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-sm ${tagClasses}`}
                >
                  {zone.name}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground font-medium">
                  {zone.capacityLabel}
                </span>
              </div>
            </div>
          );
        })}

        {/* Executive Boardroom Elements Decor */}
        <div
          style={{ left: '48px', top: '405px', width: '348px', height: '135px' }}
          className="absolute border border-border/50 rounded-lg p-2.5 flex items-center justify-center pointer-events-none"
        >
          {/* Display screen bar */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-primary/70 rounded-full flex items-center justify-center">
            <Tv className="w-2.5 h-2.5 text-background" />
          </div>

          {/* Boardroom table with chairs preview */}
          <div className="w-56 h-18 rounded-2xl border-2 border-border/80 bg-muted/60 flex items-center justify-center relative shadow-inner">
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">
              10-Seat Conference Table
            </span>

            {/* Top row of chairs */}
            <div className="absolute -top-3 left-6 right-6 flex justify-between">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-6 h-2 rounded-t-md border border-border bg-background" />
              ))}
            </div>

            {/* Bottom row of chairs */}
            <div className="absolute -bottom-3 left-6 right-6 flex justify-between">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-6 h-2 rounded-b-md border border-border bg-background" />
              ))}
            </div>
          </div>
        </div>

        {/* Coffee Bar / Pantry Decor */}
        <div
          style={{ left: '465px', top: '405px', width: '320px', height: '135px' }}
          className="absolute border border-border/50 rounded-lg p-2.5 flex flex-col justify-between pointer-events-none"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              Barista Counter & Kitchenette
            </span>
          </div>

          <div className="flex items-center justify-around py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border border-border bg-muted/80 flex items-center justify-center text-[8px] font-mono text-muted-foreground"
              >
                Stool
              </div>
            ))}
          </div>

          <div className="h-4 border-t border-border/60 flex items-center justify-between text-[9px] font-mono text-muted-foreground/70">
            <span>Water Dispenser</span>
            <span>Espresso Bar</span>
          </div>
        </div>

        {/* Dynamic Snap Guidelines for Selected Node */}
        {selectedNode && (
          <>
            {/* Horizontal guideline */}
            <div
              style={{ top: `${selectedNode.y + selectedNode.height / 2}px` }}
              className="absolute left-0 right-0 h-px border-t border-dashed border-primary/50 pointer-events-none z-10"
            />
            {/* Vertical guideline */}
            <div
              style={{ left: `${selectedNode.x + selectedNode.width / 2}px` }}
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-primary/50 pointer-events-none z-10"
            />
          </>
        )}

        {/* Placed Interactive Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isDragging = draggingNodeId === node.id;

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`Floorplan element ${node.code} - ${node.displayName}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectNode(node.id);
                }
              }}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                transform: `rotate(${node.rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: isSelected ? 25 : 15
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              className={`absolute rounded-md cursor-pointer transition-shadow select-none group ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary bg-background shadow-md'
                  : 'border border-border/80 bg-background/95 hover:border-primary/60 hover:shadow-xs'
              } ${isDragging ? 'opacity-80 scale-102' : ''}`}
            >
              {/* Node Content by Type */}
              {node.type === 'HOT_DESK' && (
                <div className="w-full h-full p-1 flex flex-col justify-between relative overflow-hidden">
                  {/* Chair Arc indicator */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 rounded-t-full border border-border bg-muted/60" />

                  {/* Desk top */}
                  <div className="flex items-center justify-between text-[9px] font-mono font-medium leading-none">
                    <span className="text-foreground font-semibold">{node.code}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        node.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>

                  {/* Laptop / Screen Bar */}
                  <div className="w-3/4 mx-auto h-1 rounded-full bg-muted-foreground/30" />

                  <div className="text-[8px] font-mono text-muted-foreground truncate leading-none">
                    {node.displayName.slice(0, 10)}
                  </div>
                </div>
              )}

              {node.type === 'DEDICATED_DESK' && (
                <div className="w-full h-full p-1 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between text-[9px] font-mono font-semibold">
                    <span>{node.code}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground text-center">
                    Dedicated
                  </div>
                </div>
              )}

              {node.type === 'MEETING_ROOM' && (
                <div className="w-full h-full p-1.5 flex flex-col justify-between items-center text-center bg-accent/20 rounded-md">
                  <span className="text-[9px] font-mono font-bold">{node.code}</span>
                  <span className="text-[8px] font-mono text-muted-foreground">
                    {node.capacity} Pax
                  </span>
                </div>
              )}

              {node.type === 'BOOTH' && (
                <div className="w-full h-full p-1 flex flex-col justify-center items-center text-center bg-emerald-500/10 border border-emerald-500/30 rounded">
                  <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {node.code}
                  </span>
                  <span className="text-[7px] font-mono text-muted-foreground">Solo</span>
                </div>
              )}

              {node.type === 'DOOR' && (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <DoorOpen className="w-4 h-4 text-purple-500" />
                </div>
              )}

              {node.type === 'WALL' && (
                <div className="w-full h-full bg-foreground/70 rounded-xs" />
              )}

              {/* Selected Node Transform Handles & Floating HUD */}
              {isSelected && (
                <>
                  {/* 8 Bounding Box Handles */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-xs bg-primary border border-background pointer-events-none" />

                  {/* Rotation Stem & Handle */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                    <button
                      type="button"
                      aria-label="Rotate node 90 degrees"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotateNode(node.id, (node.rotation + 90) % 360);
                      }}
                      className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-background cursor-pointer hover:scale-125 transition-transform shadow-xs flex items-center justify-center"
                    >
                      <RotateCw className="w-2 h-2 text-primary-foreground" />
                    </button>
                    <div className="w-px h-2 bg-primary" />
                  </div>

                  {/* Floating Quick Action HUD */}
                  <div
                    style={{ transform: `rotate(-${node.rotation}deg)` }}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border shadow-md rounded-lg px-2 py-1 flex items-center gap-2 whitespace-nowrap z-30 pointer-events-auto"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground border-r border-border pr-2">
                      X: {Math.round(node.x)} | Y: {Math.round(node.y)} | R: {node.rotation}°
                    </span>
                    <button
                      type="button"
                      aria-label="Duplicate element"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateNode(node.id);
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete element"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      className="text-rose-500 hover:text-rose-600 p-0.5 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
