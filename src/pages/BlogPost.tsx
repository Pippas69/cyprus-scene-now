import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

const BlogPost = () => {
  const { language } = useLanguage();
  const { slug } = useParams<{ slug: string }>();

  const text = {
    el: {
      back: "Πίσω στο Blog",
      minRead: "λεπτά ανάγνωσης",
      share: "Κοινοποίηση",
      notFound: "Το άρθρο δεν βρέθηκε",
      backToList: "Επιστροφή στο Blog",
    },
    en: {
      back: "Back to Blog",
      minRead: "min read",
      share: "Share",
      notFound: "Article not found",
      backToList: "Back to Blog",
    },
  };

  const t = text[language];

  const placeholderPosts = [
    {
      id: "1",
      slug: "summer-events-cyprus-2025",
      title_en: "Top Summer Events in Cyprus 2025",
      title_el: "Κορυφαίες Καλοκαιρινές Εκδηλώσεις Κύπρου 2025",
      content_en: `
# Summer is Here!

Cyprus comes alive in summer with an incredible array of events, festivals, and experiences. From beach parties to cultural festivals, here's your guide to the hottest events this season.

## Beach Parties

The coastal cities of Limassol, Paphos, and Ayia Napa host some of the best beach parties in the Mediterranean. Expect world-class DJs, stunning sunsets, and unforgettable nights.

## Cultural Festivals

Don't miss the traditional village festivals (panayiris) that celebrate Cyprus's rich cultural heritage with traditional music, dance, and food.

## Live Music Events

International and local artists perform at venues across the island, from intimate bars to large outdoor amphitheaters.

---

*Stay tuned for more updates on ΦΟΜΟ!*
      `,
      content_el: `
# Το Καλοκαίρι Έφτασε!

Η Κύπρος ζωντανεύει το καλοκαίρι με μια απίστευτη ποικιλία εκδηλώσεων, φεστιβάλ και εμπειριών. Από beach parties μέχρι πολιτιστικά φεστιβάλ, εδώ είναι ο οδηγός σας για τις πιο hot εκδηλώσεις αυτής της σεζόν.

## Beach Parties

Οι παραθαλάσσιες πόλεις της Λεμεσού, της Πάφου και της Αγίας Νάπας φιλοξενούν μερικά από τα καλύτερα beach parties στη Μεσόγειο. Περιμένετε DJs παγκόσμιας κλάσης, εκπληκτικά ηλιοβασιλέματα και αξέχαστες νύχτες.

## Πολιτιστικά Φεστιβάλ

Μην χάσετε τα παραδοσιακά πανηγύρια που γιορτάζουν την πλούσια πολιτιστική κληρονομιά της Κύπρου με παραδοσιακή μουσική, χορό και φαγητό.

## Live Music Events

Διεθνείς και τοπικοί καλλιτέχνες εμφανίζονται σε χώρους σε όλο το νησί, από μικρά μπαρ μέχρι μεγάλα υπαίθρια αμφιθέατρα.

---

*Μείνετε συντονισμένοι για περισσότερες ενημερώσεις στο ΦΟΜΟ!*
      `,
      featured_image:
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200",
      category: "events",
      published_at: "2025-06-01",
      read_time_minutes: 5,
    },
    {
      id: "2",
      slug: "boost-event-visibility",
      title_en: "How to Boost Your Event Visibility",
      title_el: "Πώς να Αυξήσεις τη Προβολή της Εκδήλωσής σου",
      content_en: `
# More visibility, more attendees

Here are practical ways to help your event show up to the right people.

## What matters most

- Great cover photo
- Clear time + location
- Strong description
- Consistent posting

---

*Pro tip: test different captions and track performance.*
      `,
      content_el: `
# Περισσότερη προβολή, περισσότεροι συμμετέχοντες

Πρακτικοί τρόποι για να εμφανίζεται η εκδήλωσή σου στα σωστά άτομα.

## Τι μετράει περισσότερο

- Δυνατή φωτογραφία
- Καθαρή ώρα + τοποθεσία
- Περιγραφή με ουσία
- Συνεπές posting

---

*Pro tip: δοκίμασε διαφορετικές λεζάντες και δες τι αποδίδει.*
      `,
      featured_image:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
      category: "tips",
      published_at: "2025-05-15",
      read_time_minutes: 7,
    },
    {
      id: "3",
      slug: "limassol-nightlife-guide",
      title_en: "The Ultimate Limassol Nightlife Guide",
      title_el: "Ο Απόλυτος Οδηγός Νυχτερινής Ζωής Λεμεσού",
      content_en: `
# Limassol after dark

A curated guide to bars, clubs and venues.

## Where to start

- Sunset drinks
- Live music
- Late-night clubs

---

*Save this guide for your next night out.*
      `,
      content_el: `
# Λεμεσός μετά τη δύση

Ένας επιμελημένος οδηγός για μπαρ, κλαμπ και venues.

## Από πού να ξεκινήσεις

- Ποτά στο ηλιοβασίλεμα
- Live μουσική
- Κλαμπ μέχρι αργά

---

*Κράτα τον οδηγό για την επόμενη έξοδό σου.*
      `,
      featured_image:
        "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1200",
      category: "guides",
      published_at: "2025-05-01",
      read_time_minutes: 10,
    },
  ];

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      // When no rows match, PostgREST returns PGRST116 (406) for object responses.
      // Treat it as "not found" so we can fall back to placeholder content.
      if (error && (error as any).code !== "PGRST116") throw error;
      return data ?? null;
    },
  });

  const placeholderBySlug = placeholderPosts.find((p) => p.slug === slug) ?? null;
  const displayPost = post ?? placeholderBySlug;

  if (!isLoading && !displayPost) {
    return (
      <div className="min-h-screen bg-background">
        <InfoNavbar />
        <div className="container mx-auto px-4 pt-32 pb-20 text-center">
          <h1 className="font-urbanist text-3xl md:text-4xl font-bold mb-4">
            {t.notFound}
          </h1>
          <p className="text-muted-foreground mb-8">{slug}</p>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backToList}
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: language === "el" ? displayPost.title_el : displayPost.title_en,
        url: window.location.href,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <InfoNavbar />
        <div className="container mx-auto px-4 pt-32">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full rounded-xl mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      <article className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Link>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-urbanist text-3xl md:text-5xl font-bold mb-4"
          >
            {language === "el" ? displayPost.title_el : displayPost.title_en}
          </motion.h1>

          {/* Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8"
          >
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {displayPost.published_at
                ? format(new Date(displayPost.published_at), "d MMMM yyyy", {
                    locale: language === "el" ? el : enUS,
                  })
                : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {displayPost.read_time_minutes} {t.minRead}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="ml-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t.share}
            </Button>
          </motion.div>

          {/* Featured Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <img
              src={displayPost.featured_image}
              alt={
                language === "el" ? displayPost.title_el : displayPost.title_en
              }
              className="w-full h-64 md:h-96 object-cover rounded-2xl"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: (language === "el"
                  ? displayPost.content_el
                  : displayPost.content_en
                )
                  .replace(/^# (.*$)/gm, "<h1>$1</h1>")
                  .replace(/^## (.*$)/gm, "<h2>$1</h2>")
                  .replace(/^### (.*$)/gm, "<h3>$1</h3>")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  .replace(/^---$/gm, "<hr>")
                  .replace(/\n\n/g, "</p><p>")
                  .replace(/^/gm, "<p>")
                  .replace(/$/gm, "</p>"),
              }}
            />
          </motion.div>

          {/* Back to Blog */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backToList}
              </Button>
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogPost;
