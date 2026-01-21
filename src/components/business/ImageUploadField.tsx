import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageUploadFieldProps {
  label: string;
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  aspectRatio?: string;
  maxSizeMB?: number;
  accept?: string;
  language: 'el' | 'en';
}

const getPreviewClasses = (aspectRatio: string) => {
  // Desktop should remain as before (lg+): 32x32
  const isSquare = aspectRatio === "1/1";

  if (isSquare) {
    // Slightly larger on mobile/tablet, unchanged on desktop
    return "w-36 h-36 md:w-40 md:h-40 lg:w-32 lg:h-32";
  }

  // Covers / banners: keep a compact but clearer preview on mobile/tablet,
  // and revert to the previous square footprint on desktop to avoid changing desktop layout.
  return "w-full max-w-[420px] h-40 md:h-48 lg:w-32 lg:h-32";
};

export const ImageUploadField = ({
  label,
  currentImageUrl,
  onFileSelect,
  aspectRatio = "1/1",
  maxSizeMB = 2,
  accept = "image/jpeg,image/png,image/webp",
  language
}: ImageUploadFieldProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const message = language === 'el' 
        ? `Το αρχείο πρέπει να είναι μικρότερο από ${maxSizeMB}MB`
        : `File must be smaller than ${maxSizeMB}MB`;
      alert(message);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
  };

  const displayImage = preview || currentImageUrl;
  const previewClasses = getPreviewClasses(aspectRatio);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        {displayImage ? (
          <div className="relative">
            <img
              src={displayImage}
              alt={label}
              className={`${previewClasses} object-cover rounded-lg border`}
              style={{ aspectRatio }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div 
            className={`${previewClasses} border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/10`}
            style={{ aspectRatio }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`upload-${label.replace(/\s/g, '-')}`}
          />
          <Label htmlFor={`upload-${label.replace(/\s/g, '-')}`}>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-10 text-sm lg:h-10 lg:text-sm"
              asChild
            >
              <span className="inline-flex items-center">
                <Upload className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs md:text-sm">
                  {language === 'el' ? 'Επιλέξτε Αρχείο' : 'Select File'}
                </span>
              </span>
            </Button>
          </Label>
          <p className="text-xs text-muted-foreground">
            {language === 'el' 
              ? `Μέγιστο μέγεθος: ${maxSizeMB}MB. Τύποι: JPEG, PNG, WebP`
              : `Maximum size: ${maxSizeMB}MB. Types: JPEG, PNG, WebP`}
          </p>
        </div>
      </div>
    </div>
  );
};
