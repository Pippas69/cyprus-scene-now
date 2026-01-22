import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageCropDialog, AspectRatioType } from "./ImageCropDialog";
import { cn } from "@/lib/utils";

interface PreviewConfig {
  label: string;
  aspectRatio: string;
  className?: string;
}

interface ImageUploadWithPreviewProps {
  label: string;
  currentImageUrl?: string | null;
  onImageReady: (blob: Blob | null) => void;
  cropAspectRatio?: AspectRatioType;
  maxSizeMB?: number;
  accept?: string;
  language: 'el' | 'en';
  // Preview configurations - show multiple previews for the same image
  previews?: PreviewConfig[];
  // Show how image appears in different contexts
  showContextPreviews?: boolean;
}

const translations = {
  el: {
    selectFile: 'Επιλέξτε Αρχείο',
    maxSize: 'Μέγιστο μέγεθος',
    types: 'Τύποι: JPEG, PNG, WebP',
    feedPreview: 'Feed',
    profilePreview: 'Προφίλ',
    offerPreview: 'Προσφορά',
    fileTooLarge: 'Το αρχείο πρέπει να είναι μικρότερο από',
    cropImage: 'Περικοπή',
  },
  en: {
    selectFile: 'Select File',
    maxSize: 'Max size',
    types: 'Types: JPEG, PNG, WebP',
    feedPreview: 'Feed',
    profilePreview: 'Profile',
    offerPreview: 'Offer',
    fileTooLarge: 'File must be smaller than',
    cropImage: 'Crop',
  },
};

export const ImageUploadWithPreview = ({
  label,
  currentImageUrl,
  onImageReady,
  cropAspectRatio = '16:9',
  maxSizeMB = 2,
  accept = "image/jpeg,image/png,image/webp",
  language,
  previews,
  showContextPreviews = false,
}: ImageUploadWithPreviewProps) => {
  const t = translations[language];
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayImage = preview || currentImageUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`${t.fileTooLarge} ${maxSizeMB}MB`);
      return;
    }

    // Create preview and open crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const url = URL.createObjectURL(croppedBlob);
    setPreview(url);
    onImageReady(croppedBlob);
    setShowCropDialog(false);
    setRawImageSrc(null);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageReady(null);
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

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="flex flex-col gap-4">
        {/* Main Image Display or Upload Placeholder */}
        {displayImage ? (
          <div className="space-y-3">
            {/* Main cropped preview */}
            <div className="relative inline-block">
              <img
                src={displayImage}
                alt={label}
                className="w-full max-w-[280px] h-auto rounded-lg border object-cover"
                style={{ 
                  aspectRatio: cropAspectRatio === '16:9' ? '16/9' : cropAspectRatio === '1:1' ? '1/1' : '4/3'
                }}
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={handleCropExisting}
                  title={t.cropImage}
                >
                  <Crop className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={handleRemove}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Context Previews - Show how image appears in different views */}
            {showContextPreviews && cropAspectRatio === '16:9' && (
              <div className="flex flex-wrap gap-3 pt-2 border-t">
                {/* Feed Preview (1:1 square) */}
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{t.feedPreview}</p>
                  <div 
                    className="w-16 h-16 rounded-lg border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
                {/* Profile Hero Preview (16:9) */}
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{t.profilePreview}</p>
                  <div 
                    className="w-28 h-16 rounded-lg border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
                {/* Offer Card Preview */}
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{t.offerPreview}</p>
                  <div 
                    className="w-20 h-12 rounded-lg border overflow-hidden bg-cover bg-center"
                    style={{ backgroundImage: `url(${displayImage})` }}
                  />
                </div>
              </div>
            )}

            {/* Custom Previews */}
            {previews && previews.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2 border-t">
                {previews.map((p, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">{p.label}</p>
                    <div 
                      className={cn(
                        "rounded-lg border overflow-hidden bg-cover bg-center",
                        p.className || "w-16 h-16"
                      )}
                      style={{ 
                        backgroundImage: `url(${displayImage})`,
                        aspectRatio: p.aspectRatio 
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors",
              cropAspectRatio === '1:1' ? "w-32 h-32" : "w-full max-w-[280px] h-32"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">{t.selectFile}</span>
          </div>
        )}

        {/* Upload Button & Info */}
        <div className="space-y-1.5">
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
            className="h-8 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3 w-3" />
            {t.selectFile}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            {t.maxSize}: {maxSizeMB}MB. {t.types}
          </p>
        </div>
      </div>

      {/* Crop Dialog */}
      {rawImageSrc && (
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
