import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

const Blog = () => {
  const { language } = useLanguage();

  const text = {
    el: {
      heroTitle: "Blog",
      heroSubtitle: "Νέα, συμβουλές και ιδέες για εκδηλώσεις στην Κύπρο",
      readMore: "Διαβάστε περισσότερα",
      minRead: "λεπτά ανάγνωσης",
      noPosts: "Δεν υπάρχουν ακόμα άρθρα. Επιστρέψτε σύντομα!",
      categories: {
        all: "Όλα",
        news: "Νέα",
        tips: "Συμβουλές",
        guides: "Οδηγοί",
        events: "Εκδηλώσεις",
      },
    },
    en: {
      heroTitle: "Blog",
      heroSubtitle: "News, tips and ideas for events in Cyprus",
      readMore: "Read more",
      minRead: "min read",
      noPosts: "No posts yet. Check back soon!",
      categories: {
        all: "All",
        news: "News",
        tips: "Tips",
        guides: "Guides",
        events: "Events",
      },
    },
  };

  const t = text[language];

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Placeholder posts for display when DB is empty
  const placeholderPosts = [
    {
      id: "1",
      slug: "summer-events-cyprus-2025",
      title_en: "Top Summer Events in Cyprus 2025",
      title_el: "Κορυφαίες Καλοκαιρινές Εκδηλώσεις Κύπρου 2025",
      excerpt_en:
        "Discover the hottest summer events happening across Cyprus this year.",
      excerpt_el:
        "Ανακαλύψτε τις πιο hot καλοκαιρινές εκδηλώσεις σε όλη την Κύπρο φέτος.",
      featured_image:
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
      category: "events",
      published_at: "2025-06-01",
      read_time_minutes: 5,
    },
    {
      id: "2",
      slug: "boost-event-visibility",
      title_en: "How to Boost Your Event Visibility",
      title_el: "Πώς να Αυξήσεις τη Προβολή της Εκδήλωσής σου",
      excerpt_en:
        "Learn strategies to get more attendees to your events using ΦΟΜΟ.",
      excerpt_el:
        "Μάθε στρατηγικές για να προσελκύσεις περισσότερους στις εκδηλώσεις σου με το ΦΟΜΟ.",
      featured_image:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      category: "tips",
      published_at: "2025-05-15",
      read_time_minutes: 7,
    },
    {
      id: "3",
      slug: "limassol-nightlife-guide",
      title_en: "The Ultimate Limassol Nightlife Guide",
      title_el: "Ο Απόλυτος Οδηγός Νυχτερινής Ζωής Λεμεσού",
      excerpt_en:
        "Your complete guide to the best bars, clubs and venues in Limassol.",
      excerpt_el:
        "Ο πλήρης οδηγός σου για τα καλύτερα μπαρ, κλαμπ και μαγαζιά της Λεμεσού.",
      featured_image:
        "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800",
      category: "guides",
      published_at: "2025-05-01",
      read_time_minutes: 10,
    },
  ];

  const displayPosts =
    posts && posts.length > 0 ? posts : placeholderPosts;

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* Hero Section - Premium Design */}
      <section className="pt-32 pb-16 px-4 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-seafoam/10 border border-seafoam/30 text-seafoam px-4 py-1.5 rounded-full text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 bg-seafoam rounded-full animate-pulse" />
            {language === "el" ? "Τελευταία Άρθρα" : "Latest Articles"}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-cinzel text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent mb-6 leading-tight tracking-tight"
          >
            {language === "el" ? "ΦΟΜΟ Blog" : "FOMO Blog"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {t.heroSubtitle}
          </motion.p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-56 w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">{t.noPosts}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {displayPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300"
                >
                  <Link to={`/blog/${post.slug}`} className="block">
                    <div className="relative overflow-hidden">
                      <img
                        src={
                          post.featured_image ||
                          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"
                        }
                        alt={
                          language === "el" ? post.title_el : post.title_en
                        }
                        className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                          {t.categories[
                            post.category as keyof typeof t.categories
                          ] || post.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="font-urbanist text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {language === "el" ? post.title_el : post.title_en}
                      </h2>
                      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
                        {language === "el" ? post.excerpt_el : post.excerpt_en}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/50 pt-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {post.published_at
                            ? format(new Date(post.published_at), "d MMM yyyy", {
                                locale: language === "el" ? el : enUS,
                              })
                            : ""}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {post.read_time_minutes} {t.minRead}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                        {t.readMore}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
