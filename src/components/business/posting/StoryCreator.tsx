import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Type, Palette, X, Image as ImageIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface StoryCreatorProps {
  backgroundType: 'gradient' | 'image';
  gradientIndex: number;
  image: File | null;
  text: string;
  textSize: number;
  textPosition: 'top' | 'center' | 'bottom';
  onBackgroundTypeChange: (type: 'gradient' | 'image') => void;
  onGradientChange: (index: number) => void;
  onImageChange: (image: File | null) => void;
  onTextChange: (text: string) => void;
  onTextSizeChange: (size: number) => void;
  onTextPositionChange: (position: 'top' | 'center' | 'bottom') => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    background: "Φόντο",
    gradient: "Gradient",
    image: "Εικόνα",
    text: "Κείμενο",
    textPlaceholder: "Γράψτε κάτι...",
    textSize: "Μέγεθος κειμένου",
    textPosition: "Θέση κειμένου",
    top: "Πάνω",
    center: "Κέντρο",
    bottom: "Κάτω",
    expiresIn: "Λήξη σε 24 ώρες",
    uploadImage: "Ανεβάστε εικόνα",
  },
  en: {
    background: "Background",
    gradient: "Gradient",
    image: "Image",
    text: "Text",
    textPlaceholder: "Write something...",
    textSize: "Text size",
    textPosition: "Text position",
    top: "Top",
    center: "Center",
    bottom: "Bottom",
    expiresIn: "Expires in 24 hours",
    uploadImage: "Upload image",
  },
};

// Mediterranean-inspired gradients
const gradients = [
  "from-cyan-500 via-blue-500 to-indigo-500",
  "from-orange-400 via-rose-400 to-pink-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-purple-500 via-violet-500 to-indigo-500",
  "from-amber-400 via-orange-500 to-red-500",
  "from-blue-400 via-cyan-400 to-teal-400",
  "from-pink-400 via-fuchsia-500 to-purple-500",
  "from-lime-400 via-emerald-500 to-teal-500",
];

export function StoryCreator({
  backgroundType,
  gradientIndex,
  image,
  text,
  textSize,
  textPosition,
  onBackgroundTypeChange,
  onGradientChange,
  onImageChange,
  onTextChange,
  onTextSizeChange,
  onTextPositionChange,
  language,
}: StoryCreatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageChange(file);
      onBackgroundTypeChange('image');
    }
  };

  const getTextPositionClass = () => {
    switch (textPosition) {
      case 'top': return 'items-start pt-12';
      case 'center': return 'items-center';
      case 'bottom': return 'items-end pb-12';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview - Phone Mockup */}
      <div className="flex justify-center">
        <div className="relative w-64 h-[500px] rounded-[2.5rem] bg-black p-2 shadow-2xl">
          {/* Phone Frame */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-b-xl z-10" />
          
          {/* Story Content */}
          <div 
            className={cn(
              "relative w-full h-full rounded-[2rem] overflow-hidden flex flex-col justify-center",
              backgroundType === 'gradient' && `bg-gradient-to-br ${gradients[gradientIndex]}`,
              getTextPositionClass()
            )}
          >
            {/* Background Image */}
            {backgroundType === 'image' && image && (
              <img
                src={URL.createObjectURL(image)}
                alt="Story background"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Text Overlay */}
            <div 
              className={cn(
                "relative z-10 px-6 text-center",
                backgroundType === 'image' && "text-shadow"
              )}
              style={{ fontSize: `${textSize}px` }}
            >
              <p className="font-bold text-white drop-shadow-lg break-words">
                {text || t.textPlaceholder}
              </p>
            </div>

            {/* 24h Badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-white/80" />
              <span className="text-xs text-white/80">{t.expiresIn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Background Type */}
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.background}</label>
          
          <div className="flex gap-2">
            <Button
              variant={backgroundType === 'gradient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onBackgroundTypeChange('gradient')}
            >
              <Palette className="h-4 w-4 mr-2" />
              {t.gradient}
            </Button>
            <Button
              variant={backgroundType === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {t.image}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Gradient Picker */}
          {backgroundType === 'gradient' && (
            <div className="flex flex-wrap gap-2">
              {gradients.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => onGradientChange(index)}
                  className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br transition-all",
                    gradient,
                    gradientIndex === index
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          )}

          {/* Image Preview */}
          {backgroundType === 'image' && image && (
            <div className="relative inline-block">
              <img
                src={URL.createObjectURL(image)}
                alt="Selected"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <button
                onClick={() => {
                  onImageChange(null);
                  onBackgroundTypeChange('gradient');
                }}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            {t.text}
          </label>
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t.textPlaceholder}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Text Size */}
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.textSize}: {textSize}px</label>
          <Slider
            value={[textSize]}
            onValueChange={([value]) => onTextSizeChange(value)}
            min={16}
            max={48}
            step={2}
            className="w-full"
          />
        </div>

        {/* Text Position */}
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.textPosition}</label>
          <div className="flex gap-2">
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <Button
                key={pos}
                variant={textPosition === pos ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTextPositionChange(pos)}
              >
                {t[pos]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
