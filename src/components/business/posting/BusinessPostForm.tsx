import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PostTypeSelector, PostType } from "./PostTypeSelector";
import { GalleryUploader } from "./GalleryUploader";
import { VideoUploader } from "./VideoUploader";
import { PollCreator, PollOption } from "./PollCreator";
import { StoryCreator } from "./StoryCreator";
import { HashtagSuggestions } from "./HashtagSuggestions";
import { PostScheduler } from "./PostScheduler";
import { useBusinessPosts } from "@/hooks/useBusinessPosts";
import { supabase } from "@/integrations/supabase/client";

interface BusinessPostFormProps {
  businessId: string;
  businessName: string;
  businessCategory: string[];
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: "Δημιουργία Post",
    back: "Πίσω",
    content: "Κείμενο",
    contentPlaceholder: "Γράψτε κάτι...",
    publish: "Δημοσίευση",
    schedule: "Προγραμματισμός",
    publishing: "Δημοσίευση...",
    success: "Το post δημοσιεύθηκε!",
    scheduled: "Το post προγραμματίστηκε!",
    error: "Σφάλμα δημιουργίας",
  },
  en: {
    title: "Create Post",
    back: "Back",
    content: "Content",
    contentPlaceholder: "Write something...",
    publish: "Publish",
    schedule: "Schedule",
    publishing: "Publishing...",
    success: "Post published!",
    scheduled: "Post scheduled!",
    error: "Creation error",
  },
};

export function BusinessPostForm({ businessId, businessName, businessCategory, language }: BusinessPostFormProps) {
  const navigate = useNavigate();
  const { createPost } = useBusinessPosts(businessId);
  const t = translations[language];

  // Form state
  const [postType, setPostType] = useState<PostType | null>(null);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [pollDuration, setPollDuration] = useState('1d');
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);

  // Story state
  const [storyBackgroundType, setStoryBackgroundType] = useState<'gradient' | 'image'>('gradient');
  const [storyGradientIndex, setStoryGradientIndex] = useState(0);
  const [storyImage, setStoryImage] = useState<File | null>(null);
  const [storyText, setStoryText] = useState('');
  const [storyTextSize, setStoryTextSize] = useState(24);
  const [storyTextPosition, setStoryTextPosition] = useState<'top' | 'center' | 'bottom'>('center');

  // Schedule state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!postType) return;
    
    setIsSubmitting(true);
    try {
      // Upload media files and get URLs (simplified - in production would upload to storage)
      const mediaUrls: string[] = [];

      await createPost.mutateAsync({
        business_id: businessId,
        post_type: postType,
        content: postType === 'story' ? storyText : content,
        media_urls: mediaUrls,
        hashtags,
        scheduled_at: isScheduled && scheduledDate ? scheduledDate.toISOString() : undefined,
        expires_at: postType === 'story' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
        poll_question: postType === 'poll' ? pollQuestion : undefined,
        poll_options: postType === 'poll' ? pollOptions.map(o => ({ text: o.text })) : undefined,
        poll_multiple_choice: postType === 'poll' ? pollMultipleChoice : undefined,
      });

      toast.success(isScheduled ? t.scheduled : t.success);
      navigate('/dashboard-business/posts');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t.title}</h1>
      </div>

      {/* Post Type Selection */}
      {!postType ? (
        <PostTypeSelector
          selectedType={postType}
          onSelectType={setPostType}
          language={language}
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Back to type selection */}
          <Button variant="outline" size="sm" onClick={() => setPostType(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>

          {/* Type-specific content */}
          {(postType === 'announcement' || postType === 'behind_the_scenes') && (
            <div className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.contentPlaceholder}
                rows={4}
              />
              <GalleryUploader images={images} onImagesChange={setImages} language={language} />
            </div>
          )}

          {postType === 'photo' && (
            <div className="space-y-4">
              <GalleryUploader images={images} onImagesChange={setImages} language={language} />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.contentPlaceholder}
                rows={3}
              />
            </div>
          )}

          {postType === 'video' && (
            <div className="space-y-4">
              <VideoUploader
                video={video}
                thumbnail={thumbnail}
                onVideoChange={setVideo}
                onThumbnailChange={setThumbnail}
                language={language}
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.contentPlaceholder}
                rows={3}
              />
            </div>
          )}

          {postType === 'poll' && (
            <PollCreator
              question={pollQuestion}
              options={pollOptions}
              duration={pollDuration}
              multipleChoice={pollMultipleChoice}
              onQuestionChange={setPollQuestion}
              onOptionsChange={setPollOptions}
              onDurationChange={setPollDuration}
              onMultipleChoiceChange={setPollMultipleChoice}
              language={language}
            />
          )}

          {postType === 'story' && (
            <StoryCreator
              backgroundType={storyBackgroundType}
              gradientIndex={storyGradientIndex}
              image={storyImage}
              text={storyText}
              textSize={storyTextSize}
              textPosition={storyTextPosition}
              onBackgroundTypeChange={setStoryBackgroundType}
              onGradientChange={setStoryGradientIndex}
              onImageChange={setStoryImage}
              onTextChange={setStoryText}
              onTextSizeChange={setStoryTextSize}
              onTextPositionChange={setStoryTextPosition}
              language={language}
            />
          )}

          {/* Hashtags (not for stories) */}
          {postType !== 'story' && (
            <HashtagSuggestions
              selectedHashtags={hashtags}
              onHashtagsChange={setHashtags}
              businessCategory={businessCategory}
              language={language}
            />
          )}

          {/* Scheduler (not for stories) */}
          {postType !== 'story' && (
            <PostScheduler
              isScheduled={isScheduled}
              scheduledDate={scheduledDate}
              onScheduledChanged={setIsScheduled}
              onDateChange={setScheduledDate}
              language={language}
            />
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              t.publishing
            ) : isScheduled ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                {t.schedule}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t.publish}
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
