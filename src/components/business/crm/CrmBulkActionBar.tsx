import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Download, Tag, TagIcon, X } from "lucide-react";

interface CrmBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onAddTag: () => void;
  onRemoveTag: () => void;
}

const translations = {
  el: {
    selected: "επιλεγμένοι",
    exportCsv: "Export CSV",
    addTag: "Προσθήκη Tag",
    removeTag: "Αφαίρεση Tag",
  },
  en: {
    selected: "selected",
    exportCsv: "Export CSV",
    addTag: "Add Tag",
    removeTag: "Remove Tag",
  },
};

export function CrmBulkActionBar({
  selectedCount,
  onClearSelection,
  onExportSelected,
  onAddTag,
  onRemoveTag,
}: CrmBulkActionBarProps) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <span className="bg-primary/10 px-2 py-0.5 rounded-full">
          {selectedCount} {t.selected}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearSelection}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onExportSelected}>
          <Download className="h-3 w-3" />
          {t.exportCsv}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onAddTag}>
          <Tag className="h-3 w-3" />
          {t.addTag}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onRemoveTag}>
          <TagIcon className="h-3 w-3" />
          {t.removeTag}
        </Button>
      </div>
    </div>
  );
}
