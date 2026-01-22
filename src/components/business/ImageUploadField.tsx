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
    cropFetchError: 'Δεν ήταν δυνατή η φόρτωση της εικόνας για περικοπή. Δοκιμάστε ξανά ή ανεβάστε την εικόνα εκ νέου.',
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
    cropFetchError: 'Could not load image for cropping. Please try again or re-upload the image.',
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

    // IMPORTANT: Persist crop by also updating the parent File state.
    // Otherwise the UI preview changes, but "Save" will not upload anything.
    const fileType = croppedBlob.type || "image/jpeg";
    const ext = fileType.includes("png") ? "png" : fileType.includes("webp") ? "webp" : "jpg";
    const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.${ext}`, {
      type: fileType,
    });
    onFileSelect(croppedFile);

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
    const openWithSrc = async (src: string) => {
      // If it's an external URL, fetch it as a blob first to avoid "tainted canvas" errors.
      // (Happens when we try to export a canvas drawn with a cross-origin image.)
      if (/^https?:\/\//i.test(src)) {
        try {
          const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          setRawImageSrc(objectUrl);
          setShowCropDialog(true);
          return;
        } catch (e) {
          console.error('Crop fetch error:', e);
          alert(t.cropFetchError);
          return;
        }
      }

      setRawImageSrc(src);
      setShowCropDialog(true);
    };

    if (displayImage) {
      void openWithSrc(displayImage);
    }
  };

  // Preview classes - larger previews
  const getPreviewClasses = () => {
    if (isSquare) {
      return "w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28";
    }
    // Cover images - adjusted to leave room for Feed preview
    return "w-[100px] h-[80px] sm:w-[140px] sm:h-[90px] lg:w-[200px] lg:h-[110px]";
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs sm:text-sm font-medium">{label}</Label>
      
      <div className="flex flex-col gap-2">
        {/* Main content row - image preview + feed preview side by side */}
        <div className="flex items-start gap-2">
          {/* Image Preview */}
          {displayImage ? (
            <div className="relative flex-shrink-0">
              <img
                src={displayImage}
                alt={label}
                className={cn(
                  getPreviewClasses(),
                  "object-cover rounded-lg border"
                )}
                style={{ aspectRatio }}
              />
              <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                {enableCrop && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={handleCropExisting}
                    title={t.cropImage}
                  >
                    <Crop className="h-2.5 w-2.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={handleRemove}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors flex-shrink-0",
                isSquare ? "w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28" : "w-[100px] h-[80px] sm:w-[140px] sm:h-[90px] lg:w-[200px] lg:h-[110px]"
              )}
              onClick={() => inputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground mb-0.5" />
              <span className="text-[9px] text-muted-foreground">{t.selectFile}</span>
            </div>
          )}

        </div>

        {/* Upload Button & Info - Compact and aligned */}
        <div className="flex items-center gap-1.5">
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
            className="h-6 px-1.5 text-[10px] sm:h-7 sm:px-2 sm:text-[11px]"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />
            {t.selectFile}
          </Button>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">
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