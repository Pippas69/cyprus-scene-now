import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, GripVertical, Clock, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PollOption {
  id: string;
  text: string;
}

interface PollCreatorProps {
  question: string;
  options: PollOption[];
  duration: string;
  multipleChoice: boolean;
  onQuestionChange: (question: string) => void;
  onOptionsChange: (options: PollOption[]) => void;
  onDurationChange: (duration: string) => void;
  onMultipleChoiceChange: (multipleChoice: boolean) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    pollQuestion: "Ερώτηση ψηφοφορίας",
    questionPlaceholder: "Ρωτήστε τους ακολούθους σας...",
    option: "Επιλογή",
    optionPlaceholder: "Προσθέστε επιλογή",
    addOption: "Προσθήκη επιλογής",
    maxOptions: "Μέγιστο 4 επιλογές",
    duration: "Διάρκεια",
    day1: "1 ημέρα",
    days3: "3 ημέρες",
    week1: "1 εβδομάδα",
    multipleChoice: "Πολλαπλές επιλογές",
    multipleChoiceDesc: "Οι χρήστες μπορούν να επιλέξουν πολλές απαντήσεις",
    preview: "Προεπισκόπηση",
    votes: "ψήφοι",
  },
  en: {
    pollQuestion: "Poll Question",
    questionPlaceholder: "Ask your followers...",
    option: "Option",
    optionPlaceholder: "Add an option",
    addOption: "Add option",
    maxOptions: "Maximum 4 options",
    duration: "Duration",
    day1: "1 day",
    days3: "3 days",
    week1: "1 week",
    multipleChoice: "Multiple choice",
    multipleChoiceDesc: "Users can select multiple answers",
    preview: "Preview",
    votes: "votes",
  },
};

export function PollCreator({
  question,
  options,
  duration,
  multipleChoice,
  onQuestionChange,
  onOptionsChange,
  onDurationChange,
  onMultipleChoiceChange,
  language,
}: PollCreatorProps) {
  const t = translations[language];

  const addOption = () => {
    if (options.length < 4) {
      onOptionsChange([
        ...options,
        { id: crypto.randomUUID(), text: '' }
      ]);
    }
  };

  const updateOption = (id: string, text: string) => {
    onOptionsChange(options.map(opt => 
      opt.id === id ? { ...opt, text } : opt
    ));
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      onOptionsChange(options.filter(opt => opt.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t.pollQuestion}</Label>
        <Input
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder={t.questionPlaceholder}
          className="text-base"
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.option}s</Label>
        
        <AnimatePresence mode="popLayout">
          {options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <Input
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`${t.option} ${index + 1}`}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {options.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.addOption}
          </Button>
        )}
        
        {options.length >= 4 && (
          <p className="text-xs text-muted-foreground text-center">
            {t.maxOptions}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t.duration}
          </Label>
          <Select value={duration} onValueChange={onDurationChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">{t.day1}</SelectItem>
              <SelectItem value="3d">{t.days3}</SelectItem>
              <SelectItem value="1w">{t.week1}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Multiple Choice Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.multipleChoice}</Label>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={multipleChoice}
              onCheckedChange={onMultipleChoiceChange}
            />
            <span className="text-xs text-muted-foreground">
              {t.multipleChoiceDesc}
            </span>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t.preview}</Label>
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="font-medium text-foreground">
            {question || t.questionPlaceholder}
          </p>
          
          {options.map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "relative overflow-hidden rounded-lg border-2 border-border bg-card p-3",
                "cursor-pointer hover:border-primary/50 transition-colors"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {option.text || `${t.option} ${index + 1}`}
                </span>
                <span className="text-xs text-muted-foreground">0 {t.votes}</span>
              </div>
              {/* Progress bar simulation */}
              <div className="absolute inset-0 bg-primary/10 w-0" />
            </div>
          ))}
          
          <p className="text-xs text-muted-foreground text-center">
            {duration === '1d' ? t.day1 : duration === '3d' ? t.days3 : t.week1}
          </p>
        </div>
      </div>
    </div>
  );
}
