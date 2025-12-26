import { motion } from "framer-motion";
import { Plus, Megaphone, Image, Video, BarChart3, Camera, Clock, Pin, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useBusinessPosts, PostType } from "@/hooks/useBusinessPosts";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BusinessPostsListProps {
  businessId: string;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: "Τα Posts μου",
    createPost: "Νέο Post",
    noPosts: "Δεν έχετε δημοσιεύσει posts ακόμα",
    createFirst: "Δημιουργήστε το πρώτο σας post",
    scheduled: "Προγραμματισμένο",
    published: "Δημοσιευμένο",
    expired: "Έληξε",
    pin: "Καρφίτσωμα",
    unpin: "Ξεκαρφίτσωμα",
    delete: "Διαγραφή",
    deleted: "Διαγράφηκε",
    views: "προβολές",
    likes: "likes",
  },
  en: {
    title: "My Posts",
    createPost: "New Post",
    noPosts: "You haven't published any posts yet",
    createFirst: "Create your first post",
    scheduled: "Scheduled",
    published: "Published",
    expired: "Expired",
    pin: "Pin",
    unpin: "Unpin",
    delete: "Delete",
    deleted: "Deleted",
    views: "views",
    likes: "likes",
  },
};

const postTypeIcons: Record<PostType, React.ElementType> = {
  announcement: Megaphone,
  photo: Image,
  video: Video,
  poll: BarChart3,
  behind_the_scenes: Camera,
  story: Clock,
};

const postTypeColors: Record<PostType, string> = {
  announcement: "from-blue-500 to-cyan-500",
  photo: "from-pink-500 to-rose-500",
  video: "from-purple-500 to-violet-500",
  poll: "from-green-500 to-emerald-500",
  behind_the_scenes: "from-orange-500 to-amber-500",
  story: "from-indigo-500 to-blue-500",
};

export function BusinessPostsList({ businessId, language }: BusinessPostsListProps) {
  const navigate = useNavigate();
  const { posts, isLoading, deletePost, togglePin } = useBusinessPosts(businessId);
  const t = translations[language];
  const dateLocale = language === 'el' ? el : enUS;

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast.success(t.deleted);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    try {
      await togglePin.mutateAsync({ postId, isPinned: !isPinned });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const getPostStatus = (post: { scheduled_at: string | null; published_at: string | null; expires_at: string | null }) => {
    if (post.expires_at && new Date(post.expires_at) < new Date()) {
      return { label: t.expired, variant: 'secondary' as const };
    }
    if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
      return { label: t.scheduled, variant: 'outline' as const };
    }
    return { label: t.published, variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button onClick={() => navigate('/dashboard-business/posts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t.createPost}
        </Button>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">{t.noPosts}</p>
              <p className="text-sm text-muted-foreground">{t.createFirst}</p>
            </div>
            <Button onClick={() => navigate('/dashboard-business/posts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t.createPost}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => {
            const Icon = postTypeIcons[post.post_type];
            const status = getPostStatus(post);

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn("overflow-hidden", post.is_pinned && "ring-2 ring-primary")}>
                  {/* Type Header */}
                  <div className={cn(
                    "h-2 bg-gradient-to-r",
                    postTypeColors[post.post_type]
                  )} />
                  
                  <CardContent className="p-4 space-y-3">
                    {/* Top Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                          postTypeColors[post.post_type]
                        )}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                          {post.is_pinned && (
                            <Pin className="inline h-3 w-3 ml-1 text-primary" />
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTogglePin(post.id, post.is_pinned)}>
                            <Pin className="h-4 w-4 mr-2" />
                            {post.is_pinned ? t.unpin : t.pin}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Content Preview */}
                    <p className="text-sm text-foreground line-clamp-3">
                      {post.content || post.poll_question || '—'}
                    </p>

                    {/* Stats & Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>{post.views_count} {t.views}</span>
                        <span>{post.likes_count} {t.likes}</span>
                      </div>
                      <span>
                        {format(new Date(post.created_at), 'PP', { locale: dateLocale })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
