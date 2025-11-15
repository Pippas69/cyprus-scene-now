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
}

export const ImageUploadField = ({
  label,
  currentImageUrl,
  onFileSelect,
  aspectRatio = "1/1",
  maxSizeMB = 2,
  accept = "image/jpeg,image/png,image/webp"
}: ImageUploadFieldProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Το αρχείο πρέπει να είναι μικρότερο από ${maxSizeMB}MB`);
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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        {displayImage ? (
          <div className="relative">
            <img
              src={displayImage}
              alt={label}
              className="w-32 h-32 object-cover rounded-lg border"
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
            className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/10"
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
            <Button type="button" variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Επιλέξτε Αρχείο
              </span>
            </Button>
          </Label>
          <p className="text-xs text-muted-foreground">
            Μέγιστο μέγεθος: {maxSizeMB}MB. Τύποι: JPEG, PNG, WebP
          </p>
        </div>
      </div>
    </div>
  );
};
