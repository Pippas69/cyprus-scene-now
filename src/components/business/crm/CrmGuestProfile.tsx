import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type CrmGuest, type CrmGuestTag, useCrmGuestNotes } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import { useGhostOriginContext } from "@/hooks/useGhostOriginContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

import {
  X, Star, Phone, Mail, Cake,
  Clock, MessageSquare, Tag, Edit3, Pin, AlertTriangle, Send, Ghost, Pencil,
  Merge, Calendar, Ticket, UtensilsCrossed, Armchair, Wine, Music, Heart,
  Plus, Trash2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { CrmGuestEditDialog } from "./CrmGuestEditDialog";
import { CrmSendMessageDialog } from "./CrmSendMessageDialog";
import { CrmGhostMergeDialog } from "./CrmGhostMergeDialog";

interface CrmGuestProfileProps {
  guest: CrmGuest;
  businessId: string;
  onClose: () => void;
  onUpdate: () => void;
  onUpdateGuest?: (data: { id: string } & Record<string, unknown>) => Promise<unknown>;
  allGuests?: CrmGuest[];
}

const translations = {
  el: {
    timeline: "Χρονολόγιο",
    notes: "Σημειώσεις",
    tags: "Tags",
    details: "Λεπτομέρειες",
    visits: "επισκέψεις",
    spend: "έξοδα",
    noShows: "no-shows",
    avgParty: "μέσο party",
    favTable: "αγαπημένο τραπέζι",
    firstVisit: "πρώτη επίσκεψη",
    lastVisit: "τελευταία",
    addNote: "Προσθήκη σημείωσης...",
    send: "Αποστολή",
    sendMessage: "Στείλε μήνυμα",
    noLinkedUser: "Δεν μπορεί να σταλεί μήνυμα σε ghost profile",
    noNotes: "Δεν υπάρχουν σημειώσεις",
    alert: "Ειδοποίηση",
    pinned: "Καρφιτσωμένο",
    deleteNote: "Διαγραφή σημείωσης",
    deleteTag: "Διαγραφή tag",
    phone: "Τηλέφωνο",
    email: "Email",
    birthday: "Γενέθλια",
    allergies: "Αλλεργίες",
    dietary: "Διατροφικές προτιμήσεις",
    seating: "Προτίμηση θέσης",
    drinks: "Ποτά",
    food: "Φαγητά",
    music: "Μουσική",
    relationNotes: "Πληροφορίες σχέσης",
    broughtBy: "Προέλευση",
    date: "Ημερομηνία",
    event: "Εκδήλωση",
    mergeProfiles: "Συγχώνευση",
    sectionContact: "Επικοινωνία",
    sectionAllergyDiet: "Αλλεργίες & Διατροφή",
    sectionPrefs: "Προτιμήσεις",
    sectionRelation: "Πληροφορίες σχέσης",
    sectionOrigin: "Προέλευση",
    noDetails: "Δεν υπάρχουν λεπτομέρειες — επεξεργαστείτε το προφίλ",
    noTags: "Δεν υπάρχουν tags",
    addTag: "Νέο tag",
    tagName: "Όνομα tag",
    create: "Δημιουργία",
    assignTags: "Επιλέξτε tags για αυτόν τον πελάτη",
  },
  en: {
    timeline: "Timeline",
    notes: "Notes",
    tags: "Tags",
    details: "Details",
    visits: "visits",
    spend: "spend",
    noShows: "no-shows",
    avgParty: "avg party",
    favTable: "favorite table",
    firstVisit: "first visit",
    lastVisit: "last visit",
    addNote: "Add a note...",
    send: "Send",
    sendMessage: "Send message",
    noLinkedUser: "Cannot send message to ghost profile",
    noNotes: "No notes yet",
    alert: "Alert",
    pinned: "Pinned",
    deleteNote: "Delete note",
    deleteTag: "Delete tag",
    phone: "Phone",
    email: "Email",
    birthday: "Birthday",
    allergies: "Allergies",
    dietary: "Dietary preferences",
    seating: "Seating",
    drinks: "Drinks",
    food: "Food",
    music: "Music",
    relationNotes: "Relationship info",
    broughtBy: "Brought by",
    date: "Date",
    event: "Event",
    mergeProfiles: "Merge",
    sectionContact: "Contact",
    sectionAllergyDiet: "Allergies & Diet",
    sectionPrefs: "Preferences",
    sectionRelation: "Relationship info",
    sectionOrigin: "Origin",
    noDetails: "No details — edit the profile to add",
    noTags: "No tags",
    addTag: "New tag",
    tagName: "Tag name",
    create: "Create",
    assignTags: "Select tags for this guest",
  },
};

function getLoyaltyBadge(visits: number, _spendCents: number, override?: string | null) {
  const level = override || (
    visits >= 20 ? "platinum" :
    visits >= 10 ? "gold" :
    visits >= 5 ? "silver" :
    visits >= 3 ? "bronze" : null
  );
  if (!level) return null;
  const map: Record<string, { emoji: string; color: string }> = {
    platinum: { emoji: "💎", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
    gold: { emoji: "🥇", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
    silver: { emoji: "🥈", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    bronze: { emoji: "🥉", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  };
  const info = map[level];
  return info ? { level, ...info } : null;
}



export function CrmGuestProfile({ guest, businessId, onClose, onUpdate, onUpdateGuest, allGuests = [] }: CrmGuestProfileProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;
  const { notes, isLoading: notesLoading, addNote } = useCrmGuestNotes(guest.id, businessId);
  const [newNote, setNewNote] = useState("");
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [noteIsAlert, setNoteIsAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Tags state
  const [guestTags, setGuestTags] = useState<CrmGuestTag[]>(guest.tags || []);
  const [allTags, setAllTags] = useState<CrmGuestTag[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    setGuestTags(guest.tags || []);
  }, [guest.id, guest.tags]);

  const isGhost = guest.profile_type === "ghost";
  const { data: originContext } = useGhostOriginContext(
    isGhost ? guest.guest_name : null,
    businessId,
    isGhost
  );

  const initials = guest.guest_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const loyalty = getLoyaltyBadge(guest.total_visits, guest.total_spend_cents, guest.vip_level_override);

  // Find pinned and alert notes for the quick stats zone
  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const alertNotes = notes.filter((n) => n.is_alert);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await addNote({
        guest_id: guest.id,
        business_id: businessId,
        author_id: user.id,
        content: newNote.trim(),
        is_pinned: noteIsPinned,
        is_alert: noteIsAlert,
      });
      setNewNote("");
      setNoteIsPinned(false);
      setNoteIsAlert(false);
      toast.success(language === "el" ? "Σημείωση αποθηκεύτηκε" : "Note saved");
    } catch {
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
    setSubmitting(false);
  };

  // Load all business tags for the tags tab
  const loadAllTags = async () => {
    if (tagsLoaded) return;
    const { data } = await supabase
      .from("crm_guest_tags")
      .select("id, name, color, emoji, is_system")
      .eq("business_id", businessId)
      .order("name");
    setAllTags((data || []) as CrmGuestTag[]);
    setTagsLoaded(true);
  };


  const deleteNote = async (noteId: string) => {
    try {
      await supabase.from("crm_guest_notes").delete().eq("id", noteId);
      queryClient.invalidateQueries({ queryKey: ["crm-guest-notes", guest.id] });
      onUpdate();
      toast.success(language === "el" ? "Σημείωση διαγράφηκε" : "Note deleted");
    } catch {
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
  };

  const deleteTag = async (tagId: string) => {
    // Optimistic UI (instant removal)
    const prevAllTags = allTags;
    const prevGuestTags = guestTags;
    setAllTags((prev) => prev.filter((t) => t.id !== tagId));
    setGuestTags((prev) => prev.filter((t) => t.id !== tagId));

    try {
      // Delete all assignments first, then the tag itself
      await supabase.from("crm_guest_tag_assignments").delete().eq("tag_id", tagId);
      await supabase.from("crm_guest_tags").delete().eq("id", tagId);
      queryClient.invalidateQueries({ queryKey: ["crm-guests", businessId] });
      onUpdate();
      toast.success(language === "el" ? "Tag διαγράφηκε" : "Tag deleted");
    } catch {
      // rollback
      setAllTags(prevAllTags);
      setGuestTags(prevGuestTags);
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);

    // Optimistic UI: show immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTag: CrmGuestTag = {
      id: tempId,
      name: newTagName.trim(),
      color: "hsl(var(--primary))",
      emoji: null,
      is_system: false,
    };
    const prevAllTags = allTags;
    const prevGuestTags = guestTags;
    setAllTags((prev) => {
      const next = [...prev, optimisticTag];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setGuestTags((prev) => [...prev, optimisticTag]);

    try {
      const { data, error } = await supabase
        .from("crm_guest_tags")
        .insert({ business_id: businessId, name: newTagName.trim(), color: "hsl(var(--primary))" })
        .select()
        .single();
      if (error) throw error;
      // Auto-assign to current guest
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("crm_guest_tag_assignments")
        .insert({ guest_id: guest.id, tag_id: data.id, assigned_by: user?.id || null });

      const createdTag = data as unknown as CrmGuestTag;
      setAllTags((prev) => {
        const next = prev.map((t) => (t.id === tempId ? createdTag : t));
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      setGuestTags((prev) => prev.map((t) => (t.id === tempId ? createdTag : t)));
      setTagsLoaded(true);

      setNewTagName("");
      setShowNewTag(false);
      queryClient.invalidateQueries({ queryKey: ["crm-guests", businessId] });
      onUpdate();
      toast.success(language === "el" ? "Tag δημιουργήθηκε" : "Tag created");
    } catch {
      // rollback optimistic UI
      setAllTags(prevAllTags);
      setGuestTags(prevGuestTags);
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
    setSavingTag(false);
  };

  // Build details data
  const g = guest as any;
  const hasContact = guest.phone || guest.email || guest.birthday;
  const hasAllergy = g.allergies?.length > 0 || guest.dietary_preferences?.length > 0;
  const hasPrefs = g.seating_preferences || guest.drink_preferences || g.food_preferences || guest.music_preferences;
  const hasRelation = guest.relationship_notes;
  const hasOrigin = isGhost && (guest.brought_by_user_id || originContext);
  const hasAnyDetails = hasContact || hasAllergy || hasPrefs || hasRelation || hasOrigin;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-card">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-base font-bold text-foreground">{guest.guest_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {guest.profile_type === "ghost" && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">Ghost</Badge>
                )}
                {loyalty && (
                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${loyalty.color}`} title={loyalty.level}>
                    {loyalty.emoji}
                  </Badge>
                )}
                {guest.internal_rating && (
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] font-medium">{guest.internal_rating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isGhost && allGuests.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowMergeDialog(true)}
                title={t.mergeProfiles}
              >
                <Merge className="h-3.5 w-3.5" />
              </Button>
            )}
            {guest.user_id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowMessageDialog(true)}
                title={t.sendMessage}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            {onUpdateGuest && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <QuickStat label={t.visits} value={String(guest.total_visits)} />
          <QuickStat label={t.spend} value={`€${(guest.total_spend_cents / 100).toFixed(0)}`} />
          <QuickStat label={t.noShows} value={String(guest.total_no_shows)} warning={guest.total_no_shows >= 2} />
        </div>

        {/* Extra stats row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[10px] text-muted-foreground">
          {guest.avg_party_size > 0 && (
            <span>👥 {t.avgParty}: {guest.avg_party_size}</span>
          )}
          {guest.total_visits > 0 && guest.favorite_table && (
            <span>🪑 {t.favTable}: {guest.favorite_table}</span>
          )}
          {guest.first_visit && (
            <span>📅 {t.firstVisit}: {format(new Date(guest.first_visit), "dd/MM/yy")}</span>
          )}
          {guest.last_visit && (
            <span>🕐 {t.lastVisit}: {formatDistanceToNow(new Date(guest.last_visit), { addSuffix: true, locale })}</span>
          )}
        </div>

        {/* Tags */}
        {guestTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {guestTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 bg-background border-border text-foreground"
              >
                {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Pinned & Alert notes indicators — between tags and email */}
        {alertNotes.length > 0 && (
          <div className="mt-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5">
            {alertNotes.map((n) => (
              <div key={n.id} className="flex items-start gap-1.5 text-[10px]">
                <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-destructive font-medium">{n.content}</span>
              </div>
            ))}
          </div>
        )}
        {pinnedNotes.filter((n) => !n.is_alert).length > 0 && (
          <div className="mt-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
            {pinnedNotes.filter((n) => !n.is_alert).map((n) => (
              <div key={n.id} className="flex items-start gap-1.5 text-[10px]">
                <Pin className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{n.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Email */}
        {guest.email && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{guest.email}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="flex-1 flex flex-col min-h-0 overflow-hidden pt-1">
        <TabsList className="mx-4 grid grid-cols-3 h-8 flex-shrink-0">
          <TabsTrigger value="notes" className="text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            {t.notes}
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs gap-1">
            <Edit3 className="h-3 w-3" />
            {t.details}
          </TabsTrigger>
          <TabsTrigger value="tags" className="text-xs gap-1" onClick={loadAllTags}>
            <Tag className="h-3 w-3" />
            {t.tags}
          </TabsTrigger>
        </TabsList>

        {/* Notes tab */}
        <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 !mt-0 px-4 pb-2 overflow-hidden">
          <ScrollArea className="flex-1 pt-2">
            {notes.length === 0 && !notesLoading ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t.noNotes}</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      note.is_alert
                        ? "border-destructive/30 bg-destructive/5"
                        : note.is_pinned
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {note.is_alert && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      {note.is_pinned && !note.is_alert && <Pin className="h-3 w-3 text-primary" />}
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1">{note.category}</Badge>
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale })}
                      </span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        title={t.deleteNote}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add note input */}
          <div className="mt-auto pt-2 border-t border-border space-y-2 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder={t.addNote}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-xs min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-8 w-8 flex-shrink-0 self-end"
                disabled={!newNote.trim() || submitting}
                onClick={handleAddNote}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* Note options */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer"
                onClick={() => setNoteIsPinned(!noteIsPinned)}>
                <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${noteIsPinned ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                  {noteIsPinned && <span className="text-[8px] text-primary-foreground">✓</span>}
                </div>
                <Pin className="h-2.5 w-2.5" />
                {t.pinned}
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer"
                onClick={() => setNoteIsAlert(!noteIsAlert)}>
                <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${noteIsAlert ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                  {noteIsAlert && <span className="text-[8px] text-primary-foreground">✓</span>}
                </div>
                <AlertTriangle className="h-2.5 w-2.5" />
                {t.alert}
              </label>
            </div>
          </div>
        </TabsContent>

        {/* Details tab */}
        <TabsContent value="details" className="flex-1 flex flex-col min-h-0 !mt-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="flex-1 pt-2">
            {!hasAnyDetails ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t.noDetails}</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                {guest.phone && <DetailRow icon={Phone} label={t.phone} value={guest.phone} />}
                {guest.email && <DetailRow icon={Mail} label={t.email} value={guest.email} />}
                {guest.birthday && <DetailRow icon={Cake} label={t.birthday} value={format(new Date(guest.birthday), "dd MMMM", { locale })} />}

                {g.allergies?.length > 0 && <DetailRow icon={AlertTriangle} label={t.allergies} value={g.allergies.join(", ")} />}
                {guest.dietary_preferences?.length ? <DetailRow icon={UtensilsCrossed} label={t.dietary} value={guest.dietary_preferences.join(", ")} /> : null}

                {g.seating_preferences && <DetailRow icon={Armchair} label={t.seating} value={g.seating_preferences} />}
                {guest.drink_preferences && <DetailRow icon={Wine} label={t.drinks} value={guest.drink_preferences} />}
                {g.food_preferences && <DetailRow icon={UtensilsCrossed} label={t.food} value={g.food_preferences} />}
                {guest.music_preferences && <DetailRow icon={Music} label={t.music} value={guest.music_preferences} />}

                {hasRelation && <DetailRow icon={Heart} label={t.relationNotes} value={guest.relationship_notes!} />}

                {hasOrigin && (
                  <>
                    {guest.brought_by_user_id && (
                      <DetailRow icon={Ghost} label={t.broughtBy} value={guest.brought_by_name || (language === "el" ? "Άγνωστος" : "Unknown")} />
                    )}
                    {(originContext?.date || guest.created_at) && (
                      <DetailRow icon={Calendar} label={t.date} value={format(new Date(originContext?.date || guest.created_at), "dd MMMM yyyy", { locale })} />
                    )}
                    {originContext?.eventTitle && (
                      <DetailRow icon={Ticket} label={t.event} value={originContext.eventTitle} />
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Tags tab */}
        <TabsContent value="tags" className="flex-1 flex flex-col min-h-0 !mt-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="flex-1 pt-2">
            <div className="space-y-2">
              {allTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2.5 w-full p-2 rounded-lg border border-border bg-background"
                >
                  <span className="text-xs font-medium text-foreground flex-1">
                    {tag.emoji && <span className="mr-1">{tag.emoji}</span>}
                    {tag.name}
                  </span>
                  {!tag.is_system && (
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      title={t.deleteTag}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {allTags.length === 0 && !showNewTag && (
                <p className="text-xs text-muted-foreground text-center py-4">{t.noTags}</p>
              )}

              {/* Create new tag */}
              {showNewTag ? (
                <div className="p-3 rounded-lg border border-border bg-card space-y-2.5">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder={t.tagName}
                    className="h-8 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createTag();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={createTag} disabled={!newTagName.trim() || savingTag}>
                      {t.create}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewTag(false)}>
                      {language === "el" ? "Ακύρωση" : "Cancel"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => setShowNewTag(true)}
                >
                  <Plus className="h-3 w-3" />
                  {t.addTag}
                </Button>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {onUpdateGuest && (
        <CrmGuestEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          guest={guest}
          onUpdate={onUpdateGuest}
          onSuccess={onUpdate}
        />
      )}

      {/* Send Message Dialog */}
      {guest.user_id && (
        <CrmSendMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          guestName={guest.guest_name}
          guestId={guest.id}
          businessId={businessId}
        />
      )}

      {/* Merge Dialog */}
      {isGhost && (
        <CrmGhostMergeDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          primaryGuest={guest}
          allGuests={allGuests}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
}

function QuickStat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <p className={`text-base font-bold ${warning ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</h4>
      <div className="rounded-lg border border-border bg-card p-2.5 space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground">{value}</p>
      </div>
    </div>
  );
}
