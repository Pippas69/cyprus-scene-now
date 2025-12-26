import { motion } from "framer-motion";
import { Megaphone, Image, Video, BarChart3, Camera, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type PostType = 'announcement' | 'photo' | 'video' | 'poll' | 'behind_the_scenes' | 'story';

interface PostTypeOption {
  type: PostType;
  icon: React.ElementType;
  labelEl: string;
  labelEn: string;
  descEl: string;
  descEn: string;
  color: string;
}

const postTypes: PostTypeOption[] = [
  {
    type: 'announcement',
    icon: Megaphone,
    labelEl: 'Ανακοίνωση',
    labelEn: 'Announcement',
    descEl: 'Σημαντικές ειδήσεις',
    descEn: 'Important updates',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'photo',
    icon: Image,
    labelEl: 'Φωτογραφία',
    labelEn: 'Photo Post',
    descEl: 'Μία ή πολλές εικόνες',
    descEn: 'Single or gallery',
    color: 'from-pink-500 to-rose-500',
  },
  {
    type: 'video',
    icon: Video,
    labelEl: 'Βίντεο',
    labelEn: 'Video',
    descEl: 'Βίντεο με thumbnail',
    descEn: 'Video with thumbnail',
    color: 'from-purple-500 to-violet-500',
  },
  {
    type: 'poll',
    icon: BarChart3,
    labelEl: 'Ψηφοφορία',
    labelEn: 'Poll',
    descEl: 'Διαδραστική ψηφοφορία',
    descEn: 'Interactive voting',
    color: 'from-green-500 to-emerald-500',
  },
  {
    type: 'behind_the_scenes',
    icon: Camera,
    labelEl: 'Παρασκήνια',
    labelEn: 'Behind the Scenes',
    descEl: 'Casual περιεχόμενο',
    descEn: 'Casual content',
    color: 'from-orange-500 to-amber-500',
  },
  {
    type: 'story',
    icon: Clock,
    labelEl: 'Story',
    labelEn: 'Story',
    descEl: '24 ώρες',
    descEn: '24 hours',
    color: 'from-indigo-500 to-blue-500',
  },
];

interface PostTypeSelectorProps {
  selectedType: PostType | null;
  onSelectType: (type: PostType) => void;
  language: 'el' | 'en';
}

export function PostTypeSelector({ selectedType, onSelectType, language }: PostTypeSelectorProps) {
  const title = language === 'el' ? 'Τι θέλετε να μοιραστείτε;' : 'What would you like to share?';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {postTypes.map((postType, index) => {
          const Icon = postType.icon;
          const isSelected = selectedType === postType.type;
          const label = language === 'el' ? postType.labelEl : postType.labelEn;
          const desc = language === 'el' ? postType.descEl : postType.descEn;

          return (
            <motion.button
              key={postType.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectType(postType.type)}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                "hover:scale-[1.02] hover:shadow-lg",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                "bg-gradient-to-br",
                postType.color
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              
              <h3 className="font-medium text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>

              {isSelected && (
                <motion.div
                  layoutId="selected-indicator"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
