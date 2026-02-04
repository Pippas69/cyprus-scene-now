import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, Percent, Infinity, RotateCcw, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

interface StudentDiscountSettingsProps {
  businessId: string;
}

const translations = {
  en: {
    title: "Student Discounts",
    description: "Offer special discounts to verified students",
    enable: "Enable student discounts",
    enableDesc: "Verified students will be able to redeem discounts at your business",
    percent: "Discount percentage",
    percentPlaceholder: "e.g. 10",
    mode: "Redemption mode",
    modeOnce: "One-time only",
    modeOnceDesc: "Student can redeem once, then it's done",
    modeUnlimited: "Unlimited",
    modeUnlimitedDesc: "Student gets discount every visit",
    save: "Save Settings",
    saving: "Saving...",
    saved: "Settings saved!",
    error: "Failed to save settings",
  },
  el: {
    title: "Φοιτητικές Εκπτώσεις",
    description: "Προσφέρετε ειδικές εκπτώσεις σε επιβεβαιωμένους φοιτητές",
    enable: "Ενεργοποίηση φοιτητικών εκπτώσεων",
    enableDesc: "Οι επιβεβαιωμένοι φοιτητές θα μπορούν να εξαργυρώνουν εκπτώσεις στην επιχείρησή σας",
    percent: "Ποσοστό έκπτωσης",
    percentPlaceholder: "π.χ. 10",
    mode: "Τρόπος εξαργύρωσης",
    modeOnce: "Μία φορά μόνο",
    modeOnceDesc: "Ο φοιτητής εξαργυρώνει μία φορά και τέλος",
    modeUnlimited: "Απεριόριστα",
    modeUnlimitedDesc: "Ο φοιτητής παίρνει έκπτωση σε κάθε επίσκεψη",
    save: "Αποθήκευση Ρυθμίσεων",
    saving: "Αποθήκευση...",
    saved: "Οι ρυθμίσεις αποθηκεύτηκαν!",
    error: "Αποτυχία αποθήκευσης ρυθμίσεων",
  }
};

export function StudentDiscountSettings({ businessId }: StudentDiscountSettingsProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState<number>(10);
  const [mode, setMode] = useState<'once' | 'unlimited'>('once');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('student_discount_enabled, student_discount_percent, student_discount_mode')
          .eq('id', businessId)
          .single();

        if (error) throw error;

        if (data) {
          setEnabled(data.student_discount_enabled || false);
          setPercent(data.student_discount_percent || 10);
          setMode((data.student_discount_mode as 'once' | 'unlimited') || 'once');
        }
      } catch (err) {
        console.error('Failed to fetch student discount settings:', err);
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchSettings();
    }
  }, [businessId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          student_discount_enabled: enabled,
          student_discount_percent: enabled ? percent : null,
          student_discount_mode: enabled ? mode : null,
        })
        .eq('id', businessId);

      if (error) throw error;
      toast.success(t.saved);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="student-discount-toggle" className="text-xs sm:text-base">
              {t.enable}
            </Label>
            <p className="text-[10px] sm:text-sm text-muted-foreground">
              {t.enableDesc}
            </p>
          </div>
          <Switch
            id="student-discount-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="shrink-0"
          />
        </div>

        {enabled && (
          <>
            {/* Discount Percent */}
            <div className="space-y-2">
              <Label htmlFor="discount-percent" className="flex items-center gap-2 text-xs sm:text-sm">
                <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.percent}
              </Label>
              <div className="relative">
                <NumberInput
                  value={percent}
                  onChange={(value) => setPercent(Math.min(100, Math.max(1, value)))}
                  min={1}
                  max={100}
                  className="pr-8 text-xs sm:text-sm"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground text-xs sm:text-sm">%</span>
              </div>
            </div>

            {/* Redemption Mode */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">{t.mode}</Label>
              <RadioGroup
                value={mode}
                onValueChange={(value) => setMode(value as 'once' | 'unlimited')}
                className="grid grid-cols-1 gap-2 sm:gap-3"
              >
                <label
                  htmlFor="mode-once"
                  className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    mode === 'once' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="once" id="mode-once" className="mt-0.5 sm:mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-xs sm:text-sm">
                      <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                      <span className="whitespace-nowrap">{t.modeOnce}</span>
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                      {t.modeOnceDesc}
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="mode-unlimited"
                  className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    mode === 'unlimited' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="unlimited" id="mode-unlimited" className="mt-0.5 sm:mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-xs sm:text-sm">
                      <Infinity className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                      <span className="whitespace-nowrap">{t.modeUnlimited}</span>
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                      {t.modeUnlimitedDesc}
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gap-2 text-xs sm:text-sm h-9 sm:h-10"
        >
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.save}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
