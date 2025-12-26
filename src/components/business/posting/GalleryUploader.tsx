import { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { Upload, X, GripVertical, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GalleryUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  language: 'el' | 'en';
}

const translations = {
  el: {
    dragDrop: "Σύρετε & αφήστε εικόνες ή",
    browse: "επιλέξτε αρχεία",
    reorder: "Σύρετε για αναδιάταξη",
    maxImages: "Μέγιστες εικόνες",
    imageTooLarge: "Η εικόνα είναι πολύ μεγάλη (μέγ. 10MB)",
    invalidType: "Μόνο εικόνες επιτρέπονται",
  },
  en: {
    dragDrop: "Drag & drop images or",
    browse: "browse files",
    reorder: "Drag to reorder",
    maxImages: "Maximum images",
    imageTooLarge: "Image too large (max 10MB)",
    invalidType: "Only images are allowed",
  },
};

export function GalleryUploader({ 
  images, 
  onImagesChange, 
  maxImages = 10,
  language 
}: GalleryUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const t = translations[language];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(t.invalidType);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t.imageTooLarge);
        continue;
      }
      validFiles.push(file);
    }

    const newImages = [...images, ...validFiles].slice(0, maxImages);
    onImagesChange(newImages);
  }, [images, maxImages, onImagesChange, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  }, [validateAndAddFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(e.target.files);
    }
  }, [validateAndAddFiles]);

  const removeImage = useCallback((index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  }, [images, onImagesChange]);

  const handleReorder = useCallback((newOrder: File[]) => {
    onImagesChange(newOrder);
  }, [onImagesChange]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50",
          images.length >= maxImages && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t.dragDrop}{" "}
            <label className="text-primary cursor-pointer hover:underline">
              {t.browse}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={images.length >= maxImages}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            {t.maxImages}: {maxImages} ({images.length}/{maxImages})
          </p>
        </div>
      </div>

      {/* Image Preview Grid with Reorder */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            {t.reorder}
          </p>
          
          <Reorder.Group
            axis="x"
            values={images}
            onReorder={handleReorder}
            className="flex gap-2 flex-wrap"
          >
            {images.map((image, index) => (
              <Reorder.Item
                key={`${image.name}-${image.size}`}
                value={image}
                className="relative group cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-24 h-24 rounded-lg overflow-hidden border border-border"
                >
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Index Badge */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Drag Handle */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}

            {/* Add More Button */}
            {images.length < maxImages && (
              <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </Reorder.Group>
        </div>
      )}
    </div>
  );
}
