import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, Check, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface FloorPlanRoom {
  id: string;
  business_id: string;
  label: string;
  sort_order: number;
}

interface FloorPlanRoomTabsProps {
  rooms: FloorPlanRoom[];
  activeRoomId: string | null;
  onSelect: (roomId: string | null) => void;
  onAdd: (label: string) => void;
  onRename: (roomId: string, label: string) => void;
  onDelete: (roomId: string) => void;
  isDesignMode: boolean;
}

const translations = {
  el: { allRooms: 'Όλοι οι χώροι', addRoom: 'Προσθήκη χώρου', newRoom: 'Νέος χώρος', delete: 'Διαγραφή' },
  en: { allRooms: 'All rooms', addRoom: 'Add room', newRoom: 'New room', delete: 'Delete' },
};

export function FloorPlanRoomTabs({ rooms, activeRoomId, onSelect, onAdd, onRename, onDelete, isDesignMode }: FloorPlanRoomTabsProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  if (rooms.length <= 1 && !isDesignMode) return null;

  const startEdit = (room: FloorPlanRoom) => {
    setEditingId(room.id);
    setEditLabel(room.label);
  };

  const saveEdit = () => {
    if (editingId && editLabel.trim()) {
      onRename(editingId, editLabel.trim());
    }
    setEditingId(null);
  };

  const handleAdd = () => {
    if (newLabel.trim()) {
      onAdd(newLabel.trim());
      setNewLabel('');
      setShowAdd(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-card/60 border border-border/30 rounded-lg px-1.5 py-1 overflow-x-auto">
      {/* All rooms tab */}
      {rooms.length > 1 && (
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            activeRoomId === null
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {t.allRooms}
        </button>
      )}

      {rooms.map((room) => (
        <div key={room.id} className="flex items-center group">
          {editingId === room.id ? (
            <div className="flex items-center gap-1">
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                className="h-7 w-24 text-xs"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => onSelect(room.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                activeRoomId === room.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {room.label}
            </button>
          )}

          {isDesignMode && editingId !== room.id && (
            <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
              <button onClick={() => startEdit(room)} className="p-0.5 rounded hover:bg-muted/50">
                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              {rooms.length > 1 && (
                <button onClick={() => onDelete(room.id)} className="p-0.5 rounded hover:bg-destructive/10">
                  <Trash2 className="h-2.5 w-2.5 text-destructive/60" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {isDesignMode && (
        <>
          {showAdd ? (
            <div className="flex items-center gap-1 ml-1">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
                placeholder={t.newRoom}
                className="h-7 w-24 text-xs"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAdd}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAdd(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground ml-1"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3 w-3" />
              {t.addRoom}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
