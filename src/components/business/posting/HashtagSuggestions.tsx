import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, TrendingUp, Star, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HashtagSuggestionsProps {
  selectedHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  businessCategory: string[];
  maxHashtags?: number;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: "Hashtags",
    trending: "Trending",
    popular: "Δημοφιλή",
    category: "Κατηγορία",
    custom: "Προσαρμοσμένο",
    addCustom: "Προσθήκη hashtag",
    add: "Προσθήκη",
    selected: "Επιλεγμένα",
    maxReached: "Μέγιστο",
  },
  en: {
    title: "Hashtags",
    trending: "Trending",
    popular: "Popular",
    category: "Category",
    custom: "Custom",
    addCustom: "Add hashtag",
    add: "Add",
    selected: "Selected",
    maxReached: "Maximum",
  },
};

// Popular Cyprus-related hashtags
const trendingHashtags = [
  '#Cyprus', '#Κύπρος', '#Limassol', '#Nicosia', '#Paphos', '#Larnaca', '#AyiaNapa',
];

const popularHashtags = [
  '#NightLife', '#LiveMusic', '#CyprusFood', '#CyprusEvents', '#WeekendVibes',
  '#PartyTime', '#GoodTimes', '#SummerNights', '#BeachBar', '#RooftopBar',
];

const categoryHashtags: Record<string, string[]> = {
  'Nightlife': ['#ClubLife', '#DJSet', '#Dance', '#NightOut', '#PartyPeople'],
  'Cafes & Restaurants': ['#Foodie', '#CyprusCuisine', '#Restaurant', '#Cafe', '#Brunch'],
  'Art & Culture': ['#Art', '#Culture', '#Exhibition', '#Gallery', '#LivePerformance'],
  'Fitness & Wellness': ['#Fitness', '#Yoga', '#Wellness', '#HealthyLifestyle', '#Workout'],
  'Music': ['#Music', '#Concert', '#LiveBand', '#Festival', '#DJSet'],
  'Sports': ['#Sports', '#Game', '#Match', '#TeamEvent', '#SportsBar'],
};

export function HashtagSuggestions({
  selectedHashtags,
  onHashtagsChange,
  businessCategory,
  maxHashtags = 30,
  language,
}: HashtagSuggestionsProps) {
  const [customHashtag, setCustomHashtag] = useState('');
  const t = translations[language];

  // Get category-specific hashtags
  const categorySpecificHashtags = useMemo(() => {
    const hashtags: string[] = [];
    businessCategory.forEach(cat => {
      const catHashtags = categoryHashtags[cat] || [];
      hashtags.push(...catHashtags);
    });
    return [...new Set(hashtags)];
  }, [businessCategory]);

  const toggleHashtag = (hashtag: string) => {
    if (selectedHashtags.includes(hashtag)) {
      onHashtagsChange(selectedHashtags.filter(h => h !== hashtag));
    } else if (selectedHashtags.length < maxHashtags) {
      onHashtagsChange([...selectedHashtags, hashtag]);
    }
  };

  const addCustomHashtag = () => {
    if (!customHashtag.trim()) return;
    
    let tag = customHashtag.trim();
    if (!tag.startsWith('#')) {
      tag = `#${tag}`;
    }
    
    if (!selectedHashtags.includes(tag) && selectedHashtags.length < maxHashtags) {
      onHashtagsChange([...selectedHashtags, tag]);
    }
    setCustomHashtag('');
  };

  const HashtagButton = ({ tag, icon }: { tag: string; icon?: React.ReactNode }) => {
    const isSelected = selectedHashtags.includes(tag);
    const isDisabled = !isSelected && selectedHashtags.length >= maxHashtags;

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleHashtag(tag)}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {icon}
        {tag}
        {isSelected && <Check className="h-3 w-3 ml-1" />}
      </motion.button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Selected Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">{t.title}</h3>
        </div>
        <Badge variant="secondary">
          {t.selected}: {selectedHashtags.length}/{maxHashtags}
        </Badge>
      </div>

      {/* Selected Hashtags */}
      {selectedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <AnimatePresence mode="popLayout">
            {selectedHashtags.map((tag) => (
              <motion.button
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => toggleHashtag(tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs"
              >
                {tag}
                <span className="ml-1 hover:text-red-200">×</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Custom Hashtag Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={customHashtag}
            onChange={(e) => setCustomHashtag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomHashtag()}
            placeholder={t.addCustom}
            className="pl-9"
          />
        </div>
        <Button
          onClick={addCustomHashtag}
          disabled={!customHashtag.trim() || selectedHashtags.length >= maxHashtags}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Trending Hashtags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <span className="font-medium text-foreground">{t.trending}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {trendingHashtags.map((tag) => (
            <HashtagButton key={tag} tag={tag} />
          ))}
        </div>
      </div>

      {/* Popular Hashtags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-foreground">{t.popular}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {popularHashtags.map((tag) => (
            <HashtagButton key={tag} tag={tag} />
          ))}
        </div>
      </div>

      {/* Category-specific Hashtags */}
      {categorySpecificHashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-foreground">{t.category}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categorySpecificHashtags.map((tag) => (
              <HashtagButton key={tag} tag={tag} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
