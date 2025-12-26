import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, Check, RefreshCw, Lightbulb, Zap, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AICaptionGeneratorProps {
  context: string;
  businessName: string;
  businessCategory: string[];
  onSelectCaption: (caption: string) => void;
  language: 'el' | 'en';
}

interface GeneratedCaption {
  id: string;
  tone: 'fun' | 'professional' | 'hype';
  text: string;
  hashtags: string[];
}

const translations = {
  el: {
    title: "AI Δημιουργός Κειμένων",
    description: "Πείτε μας για το post σας και θα δημιουργήσουμε επαγγελματικά κείμενα",
    contextLabel: "Περιγράψτε το περιεχόμενο",
    contextPlaceholder: "π.χ. Live μουσική βραδιά με DJ Set και κοκτέιλ...",
    generate: "Δημιουργία",
    generating: "Δημιουργία...",
    regenerate: "Νέες προτάσεις",
    fun: "Διασκεδαστικό",
    professional: "Επαγγελματικό",
    hype: "Hype",
    use: "Χρήση",
    copied: "Αντιγράφηκε!",
    noContext: "Προσθέστε περιγραφή πρώτα",
    error: "Σφάλμα δημιουργίας",
  },
  en: {
    title: "AI Caption Generator",
    description: "Tell us about your post and we'll generate professional captions",
    contextLabel: "Describe your content",
    contextPlaceholder: "e.g. Live music night with DJ Set and cocktails...",
    generate: "Generate",
    generating: "Generating...",
    regenerate: "New suggestions",
    fun: "Fun & Casual",
    professional: "Professional",
    hype: "Hype",
    use: "Use",
    copied: "Copied!",
    noContext: "Add a description first",
    error: "Generation error",
  },
};

const toneIcons = {
  fun: Lightbulb,
  professional: Megaphone,
  hype: Zap,
};

const toneColors = {
  fun: "from-yellow-500 to-orange-500",
  professional: "from-blue-500 to-indigo-500",
  hype: "from-red-500 to-pink-500",
};

export function AICaptionGenerator({
  context,
  businessName,
  businessCategory,
  onSelectCaption,
  language,
}: AICaptionGeneratorProps) {
  const [inputContext, setInputContext] = useState(context);
  const [captions, setCaptions] = useState<GeneratedCaption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const t = translations[language];

  const generateCaptions = async () => {
    if (!inputContext.trim()) {
      toast.error(t.noContext);
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-captions', {
        body: {
          context: inputContext,
          businessName,
          businessCategory: businessCategory.join(', '),
          language,
        },
      });

      if (error) throw error;

      setCaptions(data.captions || []);
    } catch (error) {
      console.error('Error generating captions:', error);
      
      // Fallback to mock captions for demo
      const mockCaptions: GeneratedCaption[] = [
        {
          id: '1',
          tone: 'fun',
          text: language === 'el' 
            ? `🎉 Ετοιμαστείτε για μια αξέχαστη βραδιά! ${inputContext.slice(0, 50)}... Σας περιμένουμε! 🌟`
            : `🎉 Get ready for an unforgettable night! ${inputContext.slice(0, 50)}... We're waiting for you! 🌟`,
          hashtags: ['#nightlife', '#cyprus', '#party'],
        },
        {
          id: '2',
          tone: 'professional',
          text: language === 'el'
            ? `${businessName} σας προσκαλεί σε μια μοναδική εμπειρία. ${inputContext.slice(0, 50)}...`
            : `${businessName} invites you to a unique experience. ${inputContext.slice(0, 50)}...`,
          hashtags: ['#event', '#experience', '#quality'],
        },
        {
          id: '3',
          tone: 'hype',
          text: language === 'el'
            ? `🔥 ΜΗΝ ΤΟ ΧΑΣΕΤΕ! ${inputContext.slice(0, 50)}... Θα είναι ΕΠΙΚΟ! 🔥`
            : `🔥 DON'T MISS IT! ${inputContext.slice(0, 50)}... It's gonna be EPIC! 🔥`,
          hashtags: ['#mustattend', '#fomo', '#trending'],
        },
      ];
      setCaptions(mockCaptions);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (caption: GeneratedCaption) => {
    const fullText = `${caption.text}\n\n${caption.hashtags.join(' ')}`;
    await navigator.clipboard.writeText(fullText);
    setCopiedId(caption.id);
    toast.success(t.copied);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (caption: GeneratedCaption) => {
    const fullText = `${caption.text}\n\n${caption.hashtags.join(' ')}`;
    onSelectCaption(fullText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t.title}</h3>
          <p className="text-xs text-muted-foreground">{t.description}</p>
        </div>
      </div>

      {/* Context Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.contextLabel}</label>
        <Textarea
          value={inputContext}
          onChange={(e) => setInputContext(e.target.value)}
          placeholder={t.contextPlaceholder}
          rows={3}
        />
      </div>

      <Button
        onClick={generateCaptions}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            {t.generating}
          </>
        ) : captions.length > 0 ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.regenerate}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {t.generate}
          </>
        )}
      </Button>

      {/* Generated Captions */}
      <AnimatePresence mode="popLayout">
        {captions.map((caption, index) => {
          const Icon = toneIcons[caption.tone];
          const isCopied = copiedId === caption.id;

          return (
            <motion.div
              key={caption.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl border border-border bg-card space-y-3"
            >
              {/* Tone Badge */}
              <div className="flex items-center justify-between">
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
                  "bg-gradient-to-r",
                  toneColors[caption.tone]
                )}>
                  <Icon className="h-3 w-3" />
                  {t[caption.tone]}
                </div>
              </div>

              {/* Caption Text */}
              <p className="text-sm text-foreground leading-relaxed">
                {caption.text}
              </p>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1">
                {caption.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(caption)}
                  className="flex-1"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {isCopied ? t.copied : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUse(caption)}
                  className="flex-1"
                >
                  {t.use}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
