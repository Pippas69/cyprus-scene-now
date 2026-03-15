import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { ASSET_CATALOG, CATEGORIES, type AssetDefinition } from './constants';
import { useLanguage } from '@/hooks/useLanguage';

interface AssetLibrarySidebarProps {
  onAssetDrop: (asset: AssetDefinition, x: number, y: number) => void;
}

export function AssetLibrarySidebar({ onAssetDrop }: AssetLibrarySidebarProps) {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draggedAsset, setDraggedAsset] = useState<AssetDefinition | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return ASSET_CATALOG;
    const q = search.toLowerCase();
    return ASSET_CATALOG.filter(a => a.label.toLowerCase().includes(q) || a.category.includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const map: Record<string, AssetDefinition[]> = {};
    for (const cat of CATEGORIES) map[cat.id] = [];
    for (const asset of filtered) {
      if (map[asset.category]) map[asset.category].push(asset);
    }
    return map;
  }, [filtered]);

  const toggleCategory = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e: React.DragEvent, asset: AssetDefinition) => {
    setDraggedAsset(asset);
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-md border-r border-border/30 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border/30">
        <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">
          {language === 'el' ? 'Βιβλιοθήκη' : 'Asset Library'}
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={language === 'el' ? 'Αναζήτηση...' : 'Search...'}
            className="h-8 pl-8 text-xs bg-muted/50 border-border/30"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto py-1">
        {CATEGORIES.map(cat => {
          const items = grouped[cat.id] || [];
          if (items.length === 0) return null;
          const isCollapsed = collapsed[cat.id];

          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground/70 hover:bg-accent/30 transition-colors"
              >
                <span>{cat.icon}</span>
                <span className="flex-1 text-left">{language === 'el' ? cat.label_el : cat.label_en}</span>
                <span className="text-[10px] text-muted-foreground mr-1">{items.length}</span>
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                  {items.map(asset => (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={e => handleDragStart(e, asset)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border/20 bg-muted/20 hover:bg-accent/30 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all duration-150 group select-none"
                    >
                      {/* Mini SVG preview */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <AssetPreview asset={asset} />
                      </div>
                      <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-full">
                        {asset.label}
                      </span>
                      {asset.seats > 0 && (
                        <span className="text-[8px] text-muted-foreground/60">{asset.seats}p</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: AssetDefinition }) {
  const neon = 'hsl(var(--floorplan-neon))';
  const neonFill = 'hsl(var(--floorplan-neon) / 0.15)';
  const fixFill = 'hsl(var(--floorplan-neon) / 0.08)';
  const fixStroke = 'hsl(var(--floorplan-neon) / 0.55)';

  if (asset.category === 'tables' || asset.category === 'seating') {
    if (asset.shape === 'round') {
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <circle cx={12} cy={12} r={9} fill={neonFill} stroke={neon} strokeWidth={1.2} />
        </svg>
      );
    }
    const isWide = asset.width_percent > asset.height_percent * 1.3;
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <rect
          x={isWide ? 2 : 4} y={isWide ? 6 : 4}
          width={isWide ? 20 : 16} height={isWide ? 12 : 16}
          rx={asset.shape === 'square' ? 2 : 1.5}
          fill={neonFill} stroke={neon} strokeWidth={1.2}
        />
      </svg>
    );
  }

  // Fixtures & Architecture
  if (asset.fixture_type === 'column' || asset.fixture_type === 'planter') {
    const color = asset.fixture_type === 'planter' ? '#10B981' : fixStroke;
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx={12} cy={12} r={7} fill={asset.fixture_type === 'planter' ? '#10B98120' : fixFill} stroke={color} strokeWidth={1.2} />
      </svg>
    );
  }

  if (asset.fixture_type === 'wall' || asset.fixture_type === 'fence' || asset.fixture_type === 'window' || asset.fixture_type === 'partition') {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <rect x={2} y={10} width={20} height={4} rx={1} fill={fixFill} stroke={fixStroke} strokeWidth={1} />
      </svg>
    );
  }

  if (asset.fixture_type === 'door' || asset.fixture_type === 'fire_exit') {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <rect x={4} y={10} width={16} height={4} rx={0.5} fill={fixFill} stroke={fixStroke} strokeWidth={1} />
        <path d="M 4 12 A 8 8 0 0 1 12 4" fill="none" stroke={fixStroke} strokeWidth={0.8} strokeDasharray="2 1" />
      </svg>
    );
  }

  // Generic fixture rect
  const aspectW = Math.min(asset.width_percent, 20);
  const aspectH = Math.min(asset.height_percent, 20);
  const scale = 18 / Math.max(aspectW, aspectH);
  const w = aspectW * scale;
  const h = aspectH * scale;
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect x={(24 - w) / 2} y={(24 - h) / 2} width={w} height={h} rx={1.5} fill={fixFill} stroke={fixStroke} strokeWidth={1} />
    </svg>
  );
}
