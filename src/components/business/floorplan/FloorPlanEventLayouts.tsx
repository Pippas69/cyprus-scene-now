import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Layers, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { FloorPlanEditor } from './FloorPlanEditor';
import type { FloorPlanItemFull } from './ItemPropertiesPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Template {
  id: string;
  name: string;
  layout_data: FloorPlanItemFull[];
}

interface EventFloorPlan {
  id: string;
  event_id: string;
  template_id: string | null;
  layout_data: FloorPlanItemFull[];
  reference_image_url: string | null;
}

interface FloorPlanEventLayoutsProps {
  businessId: string;
  selectedEventId: string | null;
}

const translations = {
  el: {
    noLayout: 'Δεν υπάρχει σχεδιάγραμμα',
    noLayoutHint: 'Εφαρμόστε ένα πρότυπο για να ξεκινήσετε',
    applyTemplate: 'Εφαρμογή Προτύπου',
    changeTemplate: 'Αλλαγή Προτύπου',
    selectTemplate: 'Επιλέξτε πρότυπο...',
    noTemplates: 'Δεν υπάρχουν πρότυπα. Δημιουργήστε ένα στο tab "Πρότυπα"',
    applied: 'Το πρότυπο εφαρμόστηκε',
    saved: 'Το σχεδιάγραμμα αποθηκεύτηκε',
    confirmChange: 'Αλλαγή Προτύπου',
    confirmChangeDesc: 'Αυτό θα αντικαταστήσει το υπάρχον σχεδιάγραμμα. Σίγουρα;',
    confirm: 'Εφαρμογή',
    cancel: 'Ακύρωση',
    basedOn: 'Βασισμένο σε:',
  },
  en: {
    noLayout: 'No layout yet',
    noLayoutHint: 'Apply a template to get started',
    applyTemplate: 'Apply Template',
    changeTemplate: 'Change Template',
    selectTemplate: 'Select template...',
    noTemplates: 'No templates. Create one in the "Templates" tab',
    applied: 'Template applied',
    saved: 'Layout saved',
    confirmChange: 'Change Template',
    confirmChangeDesc: 'This will replace the existing layout. Are you sure?',
    confirm: 'Apply',
    cancel: 'Cancel',
    basedOn: 'Based on:',
  },
};

export function FloorPlanEventLayouts({ businessId, selectedEventId }: FloorPlanEventLayoutsProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [eventFloorPlan, setEventFloorPlan] = useState<EventFloorPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isEditorInDesignMode, setIsEditorInDesignMode] = useState(false);

  // Load templates on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('floor_plan_templates')
        .select('id, name, layout_data')
        .eq('business_id', businessId)
        .order('sort_order');

      setTemplates((data || []).map((d: any) => ({
        ...d,
        layout_data: Array.isArray(d.layout_data) ? d.layout_data : [],
      })));
      setLoading(false);
    };
    load();
  }, [businessId]);

  // Load event's floor plan when event changes
  const loadEventFloorPlan = useCallback(async (eventId: string) => {
    setLoadingLayout(true);
    const { data, error } = await supabase
      .from('event_floor_plans')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!error && data) {
      setEventFloorPlan({
        ...data,
        layout_data: Array.isArray(data.layout_data) ? data.layout_data as unknown as FloorPlanItemFull[] : [],
      });
    } else {
      setEventFloorPlan(null);
    }
    setLoadingLayout(false);
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventFloorPlan(selectedEventId);
      setShowTemplateSelector(false);
    }
  }, [selectedEventId, loadEventFloorPlan]);

  // Apply template to event
  const applyTemplate = async (templateId: string) => {
    if (!selectedEventId) return;
    const template = templates.find((tmpl) => tmpl.id === templateId);
    if (!template) return;

    if (eventFloorPlan) {
      setPendingTemplateId(templateId);
      setConfirmChangeOpen(true);
      return;
    }

    await doApplyTemplate(templateId, template.layout_data);
  };

  const doApplyTemplate = async (templateId: string, layoutData: FloorPlanItemFull[]) => {
    if (!selectedEventId) return;

    if (eventFloorPlan) {
      const { error } = await supabase
        .from('event_floor_plans')
        .update({
          template_id: templateId,
          layout_data: layoutData as any,
        })
        .eq('id', eventFloorPlan.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from('event_floor_plans')
        .insert({
          event_id: selectedEventId,
          business_id: businessId,
          template_id: templateId,
          layout_data: layoutData as any,
        });
      if (error) { toast.error(error.message); return; }
    }

    toast.success(t.applied);
    setShowTemplateSelector(false);
    setConfirmChangeOpen(false);
    setPendingTemplateId(null);
    await loadEventFloorPlan(selectedEventId);
  };

  const handleConfirmChange = async () => {
    if (!pendingTemplateId) return;
    const template = templates.find((tmpl) => tmpl.id === pendingTemplateId);
    if (!template) return;
    await doApplyTemplate(pendingTemplateId, template.layout_data);
  };

  // Save event layout changes
  const handleSaveEventLayout = async (items: FloorPlanItemFull[]) => {
    if (!selectedEventId || !eventFloorPlan) return;
    const { error } = await supabase
      .from('event_floor_plans')
      .update({ layout_data: items as any })
      .eq('id', eventFloorPlan.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t.saved);
    setEventFloorPlan((prev) => prev ? { ...prev, layout_data: items } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!selectedEventId) {
    return null;
  }

  const selectedTemplateName = eventFloorPlan?.template_id
    ? templates.find((tmpl) => tmpl.id === eventFloorPlan.template_id)?.name
    : null;

  return (
    <div className="space-y-4">
      {loadingLayout ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !eventFloorPlan ? (
        /* No layout — show template selector */
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border/40 rounded-xl py-12 flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">{t.noLayout}</p>
              <p className="text-xs text-muted-foreground/60">{t.noLayoutHint}</p>
            </div>

            {templates.length > 0 ? (
              <div className="flex items-center gap-2">
                <Select onValueChange={(val) => applyTemplate(val)}>
                  <SelectTrigger className="h-9 w-[220px] text-xs">
                    <SelectValue placeholder={t.selectTemplate} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs">
                        {tmpl.name} ({tmpl.layout_data?.length || 0} {language === 'el' ? 'στοιχεία' : 'items'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50">{t.noTemplates}</p>
            )}
          </div>
        </div>
      ) : (
        /* Has layout — show editor */
        <div className="space-y-3">
          {/* Info bar — only visible in design/edit mode */}
          {isEditorInDesignMode && (
            <div className="flex items-center justify-between">
              {selectedTemplateName && (
                <p className="text-[10px] text-muted-foreground/60">
                  {t.basedOn} <span className="text-muted-foreground">{selectedTemplateName}</span>
                </p>
              )}
              <div className="ml-auto">
                {templates.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t.changeTemplate}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Change template selector — only in design mode */}
          {isEditorInDesignMode && showTemplateSelector && (
            <div className="flex items-center gap-2 p-2 bg-card/60 rounded-lg border border-border/20">
              <Select onValueChange={(val) => applyTemplate(val)}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder={t.selectTemplate} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs">
                      {tmpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateSelector(false)}>
                {t.cancel}
              </Button>
            </div>
          )}

          {/* Floor plan editor */}
          <FloorPlanEditor
            businessId={businessId}
            mode="event"
            eventId={selectedEventId}
            initialItems={eventFloorPlan.layout_data}
            onSaveEventLayout={handleSaveEventLayout}
            onDesignModeChange={setIsEditorInDesignMode}
          />
        </div>
      )}

      {/* Confirm change dialog */}
      <AlertDialog open={confirmChangeOpen} onOpenChange={setConfirmChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">{t.confirmChange}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">{t.confirmChangeDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange} className="text-xs">{t.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
