import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, MoreVertical, Layers, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import { FloorPlanEditor } from './FloorPlanEditor';
import type { FloorPlanItemFull } from './ItemPropertiesPanel';

interface Template {
  id: string;
  name: string;
  layout_data: FloorPlanItemFull[];
  reference_image_url: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

interface FloorPlanTemplateManagerProps {
  businessId: string;
}

const translations = {
  el: {
    title: 'Πρότυπα Σχεδιαγραμμάτων',
    subtitle: 'Δημιουργήστε πρότυπα layouts που μπορείτε να εφαρμόσετε σε εκδηλώσεις',
    newTemplate: 'Νέο Πρότυπο',
    templateName: 'Όνομα Προτύπου',
    namePlaceholder: 'π.χ. Saturday Layout',
    create: 'Δημιουργία',
    cancel: 'Ακύρωση',
    rename: 'Μετονομασία',
    duplicate: 'Αντιγραφή',
    delete: 'Διαγραφή',
    deleteConfirm: 'Σίγουρα θέλετε να διαγράψετε αυτό το πρότυπο;',
    created: 'Το πρότυπο δημιουργήθηκε',
    renamed: 'Μετονομάστηκε',
    duplicated: 'Αντιγράφηκε',
    deleted: 'Διαγράφηκε',
    noTemplates: 'Δεν έχετε πρότυπα ακόμα',
    noTemplatesHint: 'Δημιουργήστε ένα πρότυπο για να ξεκινήσετε',
    editTemplate: 'Επεξεργασία Προτύπου',
    items: 'στοιχεία',
    back: 'Πίσω',
    save: 'Αποθήκευση',
    saved: 'Το πρότυπο αποθηκεύτηκε',
  },
  en: {
    title: 'Layout Templates',
    subtitle: 'Create template layouts you can apply to events',
    newTemplate: 'New Template',
    templateName: 'Template Name',
    namePlaceholder: 'e.g. Saturday Layout',
    create: 'Create',
    cancel: 'Cancel',
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this template?',
    created: 'Template created',
    renamed: 'Renamed',
    duplicated: 'Duplicated',
    deleted: 'Deleted',
    noTemplates: 'No templates yet',
    noTemplatesHint: 'Create a template to get started',
    editTemplate: 'Edit Template',
    items: 'items',
    back: 'Back',
    save: 'Save',
    saved: 'Template saved',
  },
};

export function FloorPlanTemplateManager({ businessId }: FloorPlanTemplateManagerProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('floor_plan_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTemplates(data.map((d: any) => ({
        ...d,
        layout_data: Array.isArray(d.layout_data) ? d.layout_data : [],
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('floor_plan_templates').insert({
      business_id: businessId,
      name: newName.trim(),
      layout_data: [],
      sort_order: templates.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t.created);
    setNewName('');
    setCreateDialogOpen(false);
    await loadTemplates();
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    const { error } = await supabase
      .from('floor_plan_templates')
      .update({ name: newName.trim() })
      .eq('id', renameTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t.renamed);
    setRenameDialogOpen(false);
    setRenameTarget(null);
    setNewName('');
    await loadTemplates();
  };

  const handleDuplicate = async (tmpl: Template) => {
    const { error } = await supabase.from('floor_plan_templates').insert({
      business_id: businessId,
      name: `${tmpl.name} (copy)`,
      layout_data: tmpl.layout_data as any,
      reference_image_url: tmpl.reference_image_url,
      sort_order: templates.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t.duplicated);
    await loadTemplates();
  };

  const handleDelete = async (tmpl: Template) => {
    if (!window.confirm(t.deleteConfirm)) return;
    const { error } = await supabase
      .from('floor_plan_templates')
      .delete()
      .eq('id', tmpl.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t.deleted);
    await loadTemplates();
  };

  const handleSaveTemplateLayout = async (templateId: string, layoutItems: FloorPlanItemFull[]) => {
    const { error } = await supabase
      .from('floor_plan_templates')
      .update({ layout_data: layoutItems as any })
      .eq('id', templateId);
    if (error) { toast.error(error.message); return; }
    toast.success(t.saved);
    setEditingTemplate(null);
    await loadTemplates();
  };

  // If editing a template, show the editor
  if (editingTemplate) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{editingTemplate.name}</h3>
            <p className="text-xs text-muted-foreground">{t.editTemplate}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)} className="text-xs">
            {t.back}
          </Button>
        </div>
        <FloorPlanEditor
          businessId={businessId}
          mode="template"
          initialItems={editingTemplate.layout_data}
          onSaveTemplate={(items) => handleSaveTemplateLayout(editingTemplate.id, items)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t.title}</h3>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setNewName(''); setCreateDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t.newTemplate}
        </Button>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="border-2 border-dashed border-border/40 rounded-xl py-16 flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">{t.noTemplates}</p>
          <p className="text-xs text-muted-foreground/60">{t.noTemplatesHint}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group relative bg-card/80 border border-border/20 rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setEditingTemplate(tmpl)}
            >
              {/* Preview */}
              <div className="aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center relative overflow-hidden">
                {tmpl.screenshot_url ? (
                  <img src={tmpl.screenshot_url} alt={tmpl.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-1">
                    <Layers className="h-6 w-6 text-muted-foreground/30 mx-auto" />
                    <p className="text-[10px] text-muted-foreground/40">
                      {(tmpl.layout_data?.length || 0)} {t.items}
                    </p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium truncate">{tmpl.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(tmpl.layout_data?.length || 0)} {t.items}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => { setRenameTarget(tmpl); setNewName(tmpl.name); setRenameDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> {t.rename}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(tmpl)}>
                      <Copy className="h-3.5 w-3.5 mr-2" /> {t.duplicate}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tmpl)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> {t.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.newTemplate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">{t.templateName}</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="mt-1 h-9 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)}>{t.cancel}</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>{t.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.rename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameDialogOpen(false)}>{t.cancel}</Button>
            <Button size="sm" onClick={handleRename} disabled={!newName.trim()}>{t.rename}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
