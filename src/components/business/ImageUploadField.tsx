import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageCropDialog, AspectRatioType } from "./ImageCropDialog";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label: string;
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  aspectRatio?: string;
  maxSizeMB?: number;
  accept?: string;
  language: 'el' | 'en';
  // Enable cropping with specific aspect ratio
  enableCrop?: boolean;
  cropAspectRatio?: AspectRatioType;
  // Callback for cropped blob instead of file
  onCroppedImage?: (blob: Blob | null) => void;
  // Show context previews for cover images
  showContextPreviews?: boolean;
}

const translations = {
  el: {
    selectFile: 'Επιλέξτε',
    maxSize: 'Μέγ.',
    types: 'JPEG, PNG, WebP',
    fileTooLarge: 'Το αρχείο πρέπει να είναι μικρότερο από',
    cropImage: 'Περικοπή',
    feedPreview: 'Feed',
    profilePreview: 'Προφίλ',
    offerPreview: 'Προσφορά',
  },
  en: {
    selectFile: 'Select',
    maxSize: 'Max',
    types: 'JPEG, PNG, WebP',
    fileTooLarge: 'File must be smaller than',
    cropImage: 'Crop',
    feedPreview: 'Feed',
    profilePreview: 'Profile',
    offerPreview: 'Offer',
  },
};

export const ImageUploadField = ({
  label,
  currentImageUrl,
  onFileSelect,
  aspectRatio = "1/1",
  maxSizeMB = 2,
  accept = "image/jpeg,image/png,image/webp",
  language,
  enableCrop = false,
  cropAspectRatio = '16:9',
  onCroppedImage,
  showContextPreviews = false,
}: ImageUploadFieldProps) => {
  const t = translations[language];
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayImage = preview || currentImageUrl;
  const isSquare = aspectRatio === "1/1";
  const isCover = aspectRatio === "16/9";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`${t.fileTooLarge} ${maxSizeMB}MB`);
      return;
    }

    if (enableCrop) {
      // Open crop dialog
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Direct preview without cropping
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const url = URL.createObjectURL(croppedBlob);
    setPreview(url);
    if (onCroppedImage) {
      onCroppedImage(croppedBlob);
    }
    setShowCropDialog(false);
    setRawImageSrc(null);
  };

  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
    if (onCroppedImage) {
      onCroppedImage(null);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCropExisting = () => {
    if (displayImage) {
      setRawImageSrc(displayImage);
      setShowCropDialog(true);
    }
  };

  // Preview classes - larger previews
  const getPreviewClasses = () => {
    if (isSquare) {
      return "w-24 h-24 md:w-28 md:h-28";
    }
    // Cover images - wider preview
    return "w-full max-w-[260px] h-[100px] md:h-[120px]";
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="flex flex-col gap-3">
        {/* Image Preview */}
        {displayImage ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={displayImage}
                alt={label}
                className={cn(
                  getPreviewClasses(),
                  "object-cover rounded-lg border"
                )}
                style={{ aspectRatio }}
              />
              <div className="absolute top-1 right-1 flex gap-1">
                {enableCrop && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={handleCropExisting}
                    title={t.cropImage}
                  >
                    <Crop className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Context Previews for Cover Images */}
            {showContextPreviews && isCover && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {/* Feed Preview (1:1 square) */}
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground mb-0.5">{t.feedPreview}</p>
                  <div 
                    className="w-12 h-12 rounded-md border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
                {/* Profile Hero Preview */}
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground mb-0.5">{t.profilePreview}</p>
                  <div 
                    className="w-20 h-12 rounded-md border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
                {/* Offer Card Preview */}
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground mb-0.5">{t.offerPreview}</p>
                  <div 
                    className="w-16 h-10 rounded-md border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors",
              isSquare ? "w-24 h-24 md:w-28 md:h-28" : "w-full max-w-[260px] h-[100px] md:h-[120px]"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">{t.selectFile}</span>
          </div>
        )}

        {/* Upload Button & Info - Compact */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`upload-${label.replace(/\s/g, '-')}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            {t.selectFile}
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {t.maxSize}: {maxSizeMB}MB
          </span>
        </div>
      </div>

      {/* Crop Dialog */}
      {enableCrop && rawImageSrc && (
        <ImageCropDialog
          open={showCropDialog}
          onClose={() => {
            setShowCropDialog(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={cropAspectRatio}
          language={language}
        />
      )}
    </div>
  );
};
