import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Video, X, Play, Pause, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VideoUploaderProps {
  video: File | null;
  thumbnail: File | null;
  onVideoChange: (video: File | null) => void;
  onThumbnailChange: (thumbnail: File | null) => void;
  maxDuration?: number; // seconds
  maxSize?: number; // MB
  language: 'el' | 'en';
}

const translations = {
  el: {
    uploadVideo: "Ανεβάστε βίντεο",
    dragDrop: "Σύρετε & αφήστε ή επιλέξτε",
    maxDuration: "Μέγ. διάρκεια",
    maxSize: "Μέγ. μέγεθος",
    seconds: "δευτ.",
    thumbnail: "Thumbnail",
    autoGenerate: "Αυτόματη δημιουργία",
    customThumbnail: "Προσαρμοσμένο thumbnail",
    videoTooLong: "Το βίντεο είναι πολύ μεγάλο",
    videoTooLarge: "Το αρχείο είναι πολύ μεγάλο",
    invalidType: "Μόνο βίντεο επιτρέπονται",
    remove: "Αφαίρεση",
  },
  en: {
    uploadVideo: "Upload video",
    dragDrop: "Drag & drop or select",
    maxDuration: "Max duration",
    maxSize: "Max size",
    seconds: "sec",
    thumbnail: "Thumbnail",
    autoGenerate: "Auto-generate",
    customThumbnail: "Custom thumbnail",
    videoTooLong: "Video is too long",
    videoTooLarge: "File is too large",
    invalidType: "Only videos are allowed",
    remove: "Remove",
  },
};

export function VideoUploader({
  video,
  thumbnail,
  onVideoChange,
  onThumbnailChange,
  maxDuration = 60,
  maxSize = 100,
  language,
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = translations[language];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateVideo = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        toast.error(t.invalidType);
        resolve(false);
        return;
      }

      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${t.videoTooLarge} (${maxSize}MB)`);
        resolve(false);
        return;
      }

      // Check duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > maxDuration) {
          toast.error(`${t.videoTooLong} (${maxDuration}s)`);
          resolve(false);
        } else {
          setVideoDuration(video.duration);
          resolve(true);
        }
      };
      video.src = URL.createObjectURL(file);
    });
  }, [maxDuration, maxSize, t]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && await validateVideo(file)) {
      onVideoChange(file);
    }
  }, [validateVideo, onVideoChange]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && await validateVideo(file)) {
      onVideoChange(file);
    }
  }, [validateVideo, onVideoChange]);

  const handleThumbnailSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onThumbnailChange(file);
    }
  }, [onThumbnailChange]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const removeVideo = useCallback(() => {
    onVideoChange(null);
    onThumbnailChange(null);
    setVideoDuration(null);
    setIsPlaying(false);
  }, [onVideoChange, onThumbnailChange]);

  return (
    <div className="space-y-4">
      {!video ? (
        /* Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
              <Video className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.uploadVideo}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.dragDrop}
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{t.maxDuration}: {maxDuration}{t.seconds}</span>
              <span>{t.maxSize}: {maxSize}MB</span>
            </div>
            <label>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {t.uploadVideo}
                </span>
              </Button>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        /* Video Preview */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              src={URL.createObjectURL(video)}
              className="w-full h-full object-contain"
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* Play/Pause Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" />
                )}
              </div>
            </button>

            {/* Remove Button */}
            <button
              onClick={removeVideo}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Duration Badge */}
            {videoDuration && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs">
                {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Thumbnail Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">{t.thumbnail}</p>
              <div className="flex gap-2">
                {thumbnail ? (
                  <div className="relative w-20 h-12 rounded overflow-hidden">
                    <img
                      src={URL.createObjectURL(thumbnail)}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onThumbnailChange(null)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t.customThumbnail}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
