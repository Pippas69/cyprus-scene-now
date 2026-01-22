import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export type AspectRatioType = '16:9' | '1:1' | '4:3';

interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: AspectRatioType;
  language?: 'el' | 'en';
}

const aspectRatioValues: Record<AspectRatioType, number> = {
  '16:9': 16 / 9,
  '1:1': 1,
  '4:3': 4 / 3,
};

const translations = {
  el: {
    title: 'Περικοπή Εικόνας',
    reset: 'Επαναφορά',
    cancel: 'Ακύρωση',
    apply: 'Εφαρμογή Περικοπής',
    taintedError: 'Δεν ήταν δυνατή η εφαρμογή περικοπής λόγω περιορισμών ασφαλείας της εικόνας. Δοκιμάστε να ανεβάσετε ξανά την εικόνα.',
  },
  en: {
    title: 'Crop Image',
    reset: 'Reset',
    cancel: 'Cancel',
    apply: 'Apply Crop',
    taintedError: 'Unable to apply crop due to image security restrictions. Please re-upload the image.',
  },
};

export const ImageCropDialog = ({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = '16:9',
  language = 'el',
}: ImageCropDialogProps) => {
  const t = translations[language];
  const ratio = aspectRatioValues[aspectRatio];
  
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90 / ratio,
    x: 5,
    y: (100 - 90 / ratio) / 2,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>();
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    // Calculate initial crop to fit aspect ratio in the center
    let cropWidth = width;
    let cropHeight = width / ratio;

    if (cropHeight > height) {
      cropHeight = height;
      cropWidth = height * ratio;
    }

    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    const newCrop = {
      unit: "px" as const,
      width: cropWidth,
      height: cropHeight,
      x,
      y,
    };

    setCrop(newCrop);
    
    // Initialize completedCrop immediately so button is enabled
    setCompletedCrop({
      width: cropWidth,
      height: cropHeight,
      x,
      y,
      unit: 'px',
    });
  }, [ratio]);

  const getCroppedImage = useCallback(
    async (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement("canvas");
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Use a higher resolution output for better quality
      const outputWidth = pixelCrop.width * scaleX;
      const outputHeight = pixelCrop.height * scaleY;
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          "image/jpeg",
          0.92
        );
      });
    },
    []
  );

  const handleReset = () => {
    setZoom(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;

      let cropWidth = width;
      let cropHeight = width / ratio;

      if (cropHeight > height) {
        cropHeight = height;
        cropWidth = height * ratio;
      }

      const x = (width - cropWidth) / 2;
      const y = (height - cropHeight) / 2;

      setCrop({
        unit: "px",
        width: cropWidth,
        height: cropHeight,
        x,
        y,
      });
    }
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImage(imgRef.current, completedCrop);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error("Crop error:", error);
      if (error instanceof Error && error.name === 'SecurityError') {
        alert(t.taintedError);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[95vh] overflow-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t.title} ({aspectRatio})</DialogTitle>
        </DialogHeader>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-3 px-2 py-2 bg-muted/30 rounded-lg">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleReset}
            title={t.reset}
            className="h-9 w-9"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
            disabled={zoom <= 1}
            className="h-9 w-9"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground min-w-[3rem]">
              {Math.round(zoom * 100)}%
            </span>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            disabled={zoom >= 3}
            className="h-9 w-9"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Crop Area - Made larger */}
        <div className="flex justify-center items-center overflow-auto bg-muted/20 rounded-lg p-4 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={ratio}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              crossOrigin="anonymous"
              onLoad={onImageLoad}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                maxWidth: "100%",
                maxHeight: "60vh",
                height: "auto",
              }}
            />
          </ReactCrop>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t.cancel}
          </Button>
          <Button onClick={handleCropConfirm} disabled={!completedCrop} className="w-full sm:w-auto">
            {t.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
