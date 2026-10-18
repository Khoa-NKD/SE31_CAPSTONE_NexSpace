import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FloorplanNode,
  FloorplanTool,
  ViewMode,
  AssetTemplate
} from '../types';
import { INITIAL_NODES, INITIAL_ZONES } from '../data/mock-floorplan';
import { FloorplanCommandBar } from './floorplan-command-bar';
import { FloorplanAssetPalette } from './floorplan-asset-palette';
import { FloorplanCanvas } from './floorplan-canvas';
import { FloorplanToolbelt } from './floorplan-toolbelt';
import { FloorplanMinimap } from './floorplan-minimap';
import { FloorplanInspector } from './floorplan-inspector';

function handleDragStart(e: React.DragEvent, template: AssetTemplate) {
  e.dataTransfer.setData('application/json', JSON.stringify(template));
  e.dataTransfer.effectAllowed = 'copy';
}

export function FloorplanEditorView() {
  const [currentFloor, setCurrentFloor] = useState('Floor 12 — Main Coworking Floor');
  const [nodes, setNodes] = useState<FloorplanNode[]>(INITIAL_NODES);
  const [zones] = useState(INITIAL_ZONES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-desk-a12');

  // Canvas Viewport & Tooling States
  const [zoom, setZoom] = useState(100);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeTool, setActiveTool] = useState<FloorplanTool>('select');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isMinimapVisible, setIsMinimapVisible] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  // Undo / Redo History
  const [history, setHistory] = useState<FloorplanNode[][]>([INITIAL_NODES]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback(
    (newNodes: FloorplanNode[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, newNodes];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setNodes(history[targetIndex]);
      setHistoryIndex(targetIndex);
      toast.info('Undo completed');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setNodes(history[targetIndex]);
      setHistoryIndex(targetIndex);
      toast.info('Redo completed');
    }
  };

  // Node position update
  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, x, y } : n));
      return next;
    });
  };

  // Node full properties update
  const handleUpdateNode = (updated: FloorplanNode) => {
    const nextNodes = nodes.map((n) => (n.id === updated.id ? updated : n));
    setNodes(nextNodes);
    pushHistory(nextNodes);
    toast.success(`Updated ${updated.code}`);
  };

  // Node rotation update
  const handleRotateNode = (id: string, degrees: number) => {
    const nextNodes = nodes.map((n) => (n.id === id ? { ...n, rotation: degrees } : n));
    setNodes(nextNodes);
    pushHistory(nextNodes);
  };

  // Duplicate node
  const handleDuplicateNode = (id: string) => {
    const target = nodes.find((n) => n.id === id);
    if (!target) return;

    const newId = `node-${Date.now()}`;
    const codeNum = nodes.length + 1;
    const prefix = target.code.split('-')[0] || 'NODE';
    const newCode = `${prefix}-A${codeNum.toString().padStart(2, '0')}`;

    const duplicated: FloorplanNode = {
      ...target,
      id: newId,
      code: newCode,
      displayName: `${target.displayName} (Copy)`,
      x: target.x + 20,
      y: target.y + 20
    };

    const nextNodes = [...nodes, duplicated];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    pushHistory(nextNodes);
    toast.success(`Duplicated to ${newCode}`);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    const target = nodes.find((n) => n.id === id);
    const nextNodes = nodes.filter((n) => n.id !== id);
    setNodes(nextNodes);
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    pushHistory(nextNodes);
    toast.info(`Deleted ${target?.code || 'node'}`);
  };

  // Add asset from left palette (click or drop)
  const handleAddAsset = (template: AssetTemplate) => {
    const newId = `node-${Date.now()}`;
    const count = nodes.filter((n) => n.type === template.type).length + 1;
    const prefix = template.type === 'HOT_DESK' ? 'DESK' : template.type === 'BOOTH' ? 'POD' : 'ROOM';
    const code = `${prefix}-${count.toString().padStart(2, '0')}`;

    const newNode: FloorplanNode = {
      id: newId,
      code,
      displayName: template.name,
      type: template.type,
      typeLabel: template.name,
      zone: 'ZONE_A',
      zoneLabel: 'Zone A — Quiet Focus Area',
      x: 200,
      y: 200,
      width: template.defaultWidth,
      height: template.defaultHeight,
      rotation: 0,
      capacity: template.type === 'HOT_DESK' ? 1 : 4,
      hourlyRate: template.type === 'HOT_DESK' ? 2.5 : 8.0,
      dailyRate: template.type === 'HOT_DESK' ? 18.0 : 55.0,
      customRateOverwrite: false,
      amenities: ['Power Socket', 'Ergonomic Chair'],
      isBookable: true,
      isMaintenanceLocked: false,
      status: 'AVAILABLE'
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    pushHistory(nextNodes);
    toast.success(`Added ${template.name} (${code})`);
  };

  const handleDropNewAsset = (template: AssetTemplate, x: number, y: number) => {
    const newId = `node-${Date.now()}`;
    const count = nodes.filter((n) => n.type === template.type).length + 1;
    const prefix = template.type === 'HOT_DESK' ? 'DESK' : template.type === 'BOOTH' ? 'POD' : 'ROOM';
    const code = `${prefix}-${count.toString().padStart(2, '0')}`;

    const newNode: FloorplanNode = {
      id: newId,
      code,
      displayName: template.name,
      type: template.type,
      typeLabel: template.name,
      zone: 'ZONE_A',
      zoneLabel: 'Zone A — Quiet Focus Area',
      x,
      y,
      width: template.defaultWidth,
      height: template.defaultHeight,
      rotation: 0,
      capacity: template.type === 'HOT_DESK' ? 1 : 4,
      hourlyRate: template.type === 'HOT_DESK' ? 2.5 : 8.0,
      dailyRate: template.type === 'HOT_DESK' ? 18.0 : 55.0,
      customRateOverwrite: false,
      amenities: ['Power Socket', 'Ergonomic Chair'],
      isBookable: true,
      isMaintenanceLocked: false,
      status: 'AVAILABLE'
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    pushHistory(nextNodes);
    toast.success(`Placed ${template.name} at canvas position`);
  };

  const handleDiscard = () => {
    setNodes(INITIAL_NODES);
    setSelectedNodeId('node-desk-a12');
    setHistory([INITIAL_NODES]);
    setHistoryIndex(0);
    toast.info('Discarded unsaved CAD layout changes');
  };

  const handleSavePublish = () => {
    toast.success('Floor Plan published successfully!', {
      description: `Active layout updated with ${nodes.length} spatial units on ${currentFloor}.`
    });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] w-full bg-background overflow-hidden select-none border border-border rounded-xl shadow-xs">
      {/* Top CAD Command Bar */}
      <FloorplanCommandBar
        currentFloor={currentFloor}
        onFloorChange={setCurrentFloor}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(200, z + 10))}
        onZoomOut={() => setZoom((z) => Math.max(50, z - 10))}
        onZoomReset={() => setZoom(100)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDiscard={handleDiscard}
        onSavePublish={handleSavePublish}
      />

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Asset Palette */}
        {viewMode === 'edit' && (
          <FloorplanAssetPalette
            onAddAsset={handleAddAsset}
            onDragStart={handleDragStart}
          />
        )}

        {/* Center: CAD Blueprint Canvas with Toolbelt & Radar Minimap */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <FloorplanCanvas
            nodes={nodes}
            zones={zones}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodePosition={handleUpdateNodePosition}
            onRotateNode={handleRotateNode}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onDropNewAsset={handleDropNewAsset}
            zoom={zoom}
            snapToGrid={snapToGrid}
            activeTool={activeTool}
            isGridVisible={isGridVisible}
          />

          {/* Floating Toolbelt */}
          <FloorplanToolbelt
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isMinimapVisible={isMinimapVisible}
            onToggleMinimap={() => setIsMinimapVisible(!isMinimapVisible)}
          />

          {/* Floating Radar Minimap */}
          {isMinimapVisible && (
            <FloorplanMinimap
              nodes={nodes}
              zones={zones}
              selectedNodeId={selectedNodeId}
              zoom={zoom}
              onClose={() => setIsMinimapVisible(false)}
            />
          )}
        </div>

        {/* Right: Properties Inspector */}
        {viewMode === 'edit' && (
          <FloorplanInspector
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeselect={() => setSelectedNodeId(null)}
            onDuplicate={handleDuplicateNode}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}
