import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Download, Tag, TagIcon, Send, X } from "lucide-react";

interface CrmBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onAddTag: () => void;
  onRemoveTag: () => void;
  onSendMessage: () => void;
}

const translations = {
  el: {
    selected: "επιλεγμένοι",
    exportXlsx: "Export Excel",
    addTag: "Προσθήκη Tag",
    removeTag: "Αφαίρεση Tag",
    sendMessage: "Αποστολή",
  },
  en: {
    selected: "selected",
    exportXlsx: "Export Excel",
    addTag: "Add Tag",
    removeTag: "Remove Tag",
    sendMessage: "Send",
  },
};

export function CrmBulkActionBar({
  selectedCount,
  onClearSelection,
  onExportSelected,
  onAddTag,
  onRemoveTag,
  onSendMessage,
}: CrmBulkActionBarProps) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 pt-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium text-primary">
        <span className="bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap">
          {selectedCount} {t.selected}
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={onClearSelection}>
          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
        <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 px-2 sm:px-3" onClick={onSendMessage}>
          <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          {t.sendMessage}
        </Button>
        <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 px-2 sm:px-3" onClick={onExportSelected}>
          <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          {t.exportXlsx}
        </Button>
      </div>
    </div>
  );
}
