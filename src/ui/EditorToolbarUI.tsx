import React, { useState, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { PropType, TileType } from '../types';
import { EditorTool } from '../editor/MapEditor';
import {
  PenTool,
  Trees,
  Eraser,
  Undo,
  Redo,
  Save,
  Download,
  RotateCcw,
  Layers,
  Sparkles,
  Mountain,
  Home,
  Flower2,
  TreePine,
  Fence,
  Box,
  Signpost,
  Sprout,
  Building2,
  Landmark,
  Store,
  Flame,
  ShoppingBag,
  Beer,
  Warehouse,
} from 'lucide-react';

interface EditorToolbarProps {
  engine: GameEngine | null;
  isEditorMode: boolean;
  onToggleEditor: () => void;
  onNotify: (msg: string) => void;
}

export const EditorToolbarUI: React.FC<EditorToolbarProps> = ({
  engine,
  isEditorMode,
  onToggleEditor,
  onNotify,
}) => {
  const [activeTool, setActiveTool] = useState<EditorTool>('VOXEL');
  const [selectedTileType, setSelectedTileType] = useState<TileType>(TileType.GRASS);
  const [selectedHeight, setSelectedHeight] = useState<number>(1);
  const [selectedPropType, setSelectedPropType] = useState<PropType>(PropType.PINE_TREE);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  useEffect(() => {
    if (!engine) return;
    const editor = engine.getMapEditor();

    const interval = setInterval(() => {
      setCanUndo(editor.commandHistory.canUndo());
      setCanRedo(editor.commandHistory.canRedo());
    }, 250);

    return () => clearInterval(interval);
  }, [engine]);

  if (!engine) return null;
  const editor = engine.getMapEditor();

  const handleToolChange = (tool: EditorTool) => {
    setActiveTool(tool);
    editor.activeTool = tool;
  };

  const handleTileTypeChange = (t: TileType) => {
    setSelectedTileType(t);
    editor.selectedTileType = t;
    handleToolChange('VOXEL');
  };

  const handleHeightChange = (h: number) => {
    setSelectedHeight(h);
    editor.selectedHeight = h;
  };

  const handlePropTypeChange = (p: PropType) => {
    setSelectedPropType(p);
    editor.selectedPropType = p;
    handleToolChange('BILLBOARD');
  };

  const handleUndo = () => {
    if (editor.commandHistory.undo()) {
      onNotify('Deshecho último cambio');
    }
  };

  const handleRedo = () => {
    if (editor.commandHistory.redo()) {
      onNotify('Rehecho cambio');
    }
  };

  const handleSave = () => {
    engine.saveCurrentMap();
    onNotify('💾 Mapa guardado en LocalStorage');
  };

  const handleExport = () => {
    engine.exportCurrentMapFile();
    onNotify('📥 Archivo .json descargado');
  };

  const handleResetDemo = () => {
    engine.reloadDemoMap();
    onNotify('🔄 demo_map.json recargado');
  };

  return (
    <div className="flex flex-col gap-2.5 max-w-xl w-full">
      {/* Editor Control Header */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 p-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-emerald-300 tracking-wider uppercase">
            Modo Editor In-Engine
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
            F1
          </span>
        </div>

        {/* Undo / Redo / Save Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 transition-all"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 transition-all"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            onClick={handleSave}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition-all shadow-md"
            title="Guardar en LocalStorage"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            title="Exportar JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetDemo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all"
            title="Recargar Demo Original"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Palette Dock */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-3">
        {/* Tool Category Selector */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => handleToolChange('VOXEL')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all border ${
              activeTool === 'VOXEL'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Pintar Voxels
          </button>

          <button
            onClick={() => handleToolChange('BILLBOARD')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all border ${
              activeTool === 'BILLBOARD'
                ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Trees className="w-3.5 h-3.5" />
            Billboards
          </button>

          <button
            onClick={() => handleToolChange('ERASE')}
            className={`py-1.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all border ${
              activeTool === 'ERASE'
                ? 'bg-red-600 border-red-400 text-white shadow-lg'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Borrar (Shift + Click)"
          >
            <Eraser className="w-3.5 h-3.5" />
            Borrar
          </button>
        </div>

        {/* Sub-Palette: Voxel Options */}
        {activeTool === 'VOXEL' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Material Terreno:</span>
              <span>Altura Voxel: {selectedHeight}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { type: TileType.GRASS, label: 'Pasto', color: 'bg-emerald-600' },
                  { type: TileType.STONE_COBBLE, label: 'Adoquín', color: 'bg-stone-500 text-stone-100 font-bold' },
                  { type: TileType.DIRT, label: 'Tierra', color: 'bg-amber-800' },
                  { type: TileType.STONE, label: 'Piedra', color: 'bg-slate-500' },
                  { type: TileType.CASTLE_WALL, label: 'Muralla', color: 'bg-zinc-800 text-zinc-100' },
                  { type: TileType.PATH, label: 'Camino', color: 'bg-amber-200 text-slate-900' },
                  { type: TileType.WATER, label: 'Agua', color: 'bg-cyan-600' },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleTileTypeChange(item.type)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      selectedTileType === item.type
                        ? 'ring-2 ring-emerald-400 border-white scale-105 shadow'
                        : 'border-slate-700 opacity-80 hover:opacity-100'
                    } ${item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Height Stepper */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 font-mono text-xs">
                {[1, 2, 3, 4, 5].map((h) => (
                  <button
                    key={h}
                    onClick={() => handleHeightChange(h)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      selectedHeight === h
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Grass-Dirt Transition Sub-Section */}
            <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2 text-left">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Transiciones de Pasto/Tierra (Autotiling):
              </div>
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  { type: TileType.GRASS_DIRT_N, label: 'Trans. N', color: 'bg-gradient-to-b from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_S, label: 'Trans. S', color: 'bg-gradient-to-t from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_W, label: 'Trans. W', color: 'bg-gradient-to-r from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_E, label: 'Trans. E', color: 'bg-gradient-to-l from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_NE, label: 'Corn. NE', color: 'bg-gradient-to-tr from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_NW, label: 'Corn. NW', color: 'bg-gradient-to-tl from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_SE, label: 'Corn. SE', color: 'bg-gradient-to-br from-amber-800 to-emerald-600' },
                  { type: TileType.GRASS_DIRT_SW, label: 'Corn. SW', color: 'bg-gradient-to-bl from-amber-800 to-emerald-600' },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleTileTypeChange(item.type)}
                    className={`px-1 py-1 rounded text-[10px] font-bold flex items-center justify-center transition-all border text-white truncate ${
                      selectedTileType === item.type
                        ? 'ring-2 ring-emerald-400 border-white scale-105 shadow'
                        : 'border-slate-700 opacity-80 hover:opacity-100'
                    } ${item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sub-Palette: Billboard Prop Options */}
        {activeTool === 'BILLBOARD' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Elementos y Vegetación (GRASS+):</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {[
                { type: PropType.FOUNTAIN, label: 'Fuente Real (3x3)', icon: Landmark, color: 'hover:border-cyan-400' },
                { type: PropType.STREET_LAMP, label: 'Farol Real (Luz)', icon: Flame, color: 'hover:border-amber-400' },
                { type: PropType.MARKET_STALL_RED, label: 'Puesto Rojo (2x2)', icon: Store, color: 'hover:border-rose-400' },
                { type: PropType.MARKET_STALL_BLUE, label: 'Puesto Azul (2x2)', icon: ShoppingBag, color: 'hover:border-blue-400' },
                { type: PropType.BARRELS_STACK, label: 'Pila Barriles', icon: Beer, color: 'hover:border-amber-600' },
                { type: PropType.BARREL_SINGLE, label: 'Barril Único', icon: Beer, color: 'hover:border-amber-500' },
                { type: PropType.CRATE_STACK, label: 'Pila Cajas/Sacos', icon: Box, color: 'hover:border-amber-400' },
                { type: PropType.BENCH_WOOD, label: 'Banco Plaza', icon: Fence, color: 'hover:border-amber-300' },
                { type: PropType.SHOP_HOUSE_1, label: 'Tienda 1 (3x3)', icon: Building2, color: 'hover:border-blue-400' },
                { type: PropType.SHOP_HOUSE_2, label: 'Herrería (3x3)', icon: Building2, color: 'hover:border-orange-400' },
                { type: PropType.SHOP_HOUSE_3, label: 'Taberna (3x3)', icon: Store, color: 'hover:border-amber-400' },
                { type: PropType.MANOR_HOUSE, label: 'Mansión (4x4)', icon: Landmark, color: 'hover:border-purple-400' },
                { type: PropType.GUILD_HALL, label: 'Gremio (4x4)', icon: Warehouse, color: 'hover:border-yellow-400' },
                { type: PropType.TREE_GRAND_OAK, label: 'Roble Imperial (2x2)', icon: Trees, color: 'hover:border-emerald-400' },
                { type: PropType.TREE_LUSH_PINE, label: 'Pino Real (2x2)', icon: TreePine, color: 'hover:border-emerald-500' },
                { type: PropType.TREE_TOWN_GREEN, label: 'Árbol Plaza', icon: Trees, color: 'hover:border-green-400' },
                { type: PropType.BUSH_FLOWERING, label: 'Arbusto Flor', icon: Sprout, color: 'hover:border-rose-300' },
                { type: PropType.BUSH_ROUND, label: 'Arbusto Redondo', icon: Sprout, color: 'hover:border-green-400' },
                { type: PropType.FENCE_WOOD, label: 'Cerca Madera', icon: Fence, color: 'hover:border-amber-400' },
                { type: PropType.FLOWERS_WILD, label: 'Flores Rojas', icon: Flower2, color: 'hover:border-rose-400' },
                { type: PropType.FLOWERS_BLUE, label: 'Flores Azules', icon: Sparkles, color: 'hover:border-cyan-400' },
                { type: PropType.SIGNPOST, label: 'Cartel Guía', icon: Signpost, color: 'hover:border-amber-500' },
                { type: PropType.CRATE, label: 'Cofre / Caja', icon: Box, color: 'hover:border-amber-600' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handlePropTypeChange(item.type)}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all border truncate ${
                      selectedPropType === item.type
                        ? 'bg-amber-600 border-amber-300 text-white shadow-lg font-bold'
                        : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                    } ${item.color}`}
                    title={item.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
