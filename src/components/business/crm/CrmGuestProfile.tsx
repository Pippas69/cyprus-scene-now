import { useState, useEffect } from "react";
import { type CrmGuest, useCrmGuestNotes } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Star, MapPin, Phone, Mail, Cake, Instagram, Building2,
  Clock, MessageSquare, Tag, Edit3, Pin, AlertTriangle, Send, Ghost, Pencil,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { CrmGuestEditDialog } from "./CrmGuestEditDialog";
import { CrmSendMessageDialog } from "./CrmSendMessageDialog";

interface CrmGuestProfileProps {
  guest: CrmGuest;
  businessId: string;
  onClose: () => void;
  onUpdate: () => void;
  onUpdateGuest?: (data: { id: string } & Record<string, unknown>) => Promise<unknown>;
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
    phone: "Τηλέφωνο",
    email: "Email",
    birthday: "Γενέθλια",
    company: "Εταιρεία",
    dietary: "Διατροφικές",
    drinks: "Ποτά",
    music: "Μουσική",
    instagram: "Instagram",
    relationNotes: "Σχέσεις",
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
    phone: "Phone",
    email: "Email",
    birthday: "Birthday",
    company: "Company",
    dietary: "Dietary",
    drinks: "Drinks",
    music: "Music",
    instagram: "Instagram",
    relationNotes: "Relations",
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

export function CrmGuestProfile({ guest, businessId, onClose, onUpdate, onUpdateGuest }: CrmGuestProfileProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;
  const { notes, isLoading: notesLoading, addNote } = useCrmGuestNotes(guest.id, businessId);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const initials = guest.guest_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const loyalty = getLoyaltyBadge(guest.total_visits, guest.total_spend_cents, guest.vip_level_override);

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
      });
      setNewNote("");
      toast.success(language === "el" ? "Σημείωση αποθηκεύτηκε" : "Note saved");
    } catch {
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
    setSubmitting(false);
  };

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
          {guest.favorite_table && (
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
        {guest.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {guest.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4"
                style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}
              >
                {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 grid grid-cols-3 h-8">
          <TabsTrigger value="notes" className="text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            {t.notes}
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs gap-1">
            <Edit3 className="h-3 w-3" />
            {t.details}
          </TabsTrigger>
          <TabsTrigger value="tags" className="text-xs gap-1">
            <Tag className="h-3 w-3" />
            {t.tags}
          </TabsTrigger>
        </TabsList>

        {/* Notes tab */}
        <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pb-4">
          <ScrollArea className="flex-1 mt-2">
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
                      {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1">{note.category}</Badge>
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale })}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add note input */}
          <div className="flex gap-2 mt-2 pt-2 border-t border-border">
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
        </TabsContent>

        {/* Details tab */}
        <TabsContent value="details" className="flex-1 min-h-0 mt-0 px-4 pb-4">
          <ScrollArea className="h-full mt-2">
            <div className="space-y-2.5">
              {guest.phone && guest.profile_type !== "ghost" && <DetailRow icon={Phone} label={t.phone} value={guest.phone} />}
              {guest.email && <DetailRow icon={Mail} label={t.email} value={guest.email} />}
              {guest.birthday && <DetailRow icon={Cake} label={t.birthday} value={format(new Date(guest.birthday), "dd MMMM", { locale })} />}
              {guest.company && <DetailRow icon={Building2} label={t.company} value={guest.company} />}
              {guest.instagram_handle && <DetailRow icon={Instagram} label={t.instagram} value={`@${guest.instagram_handle}`} />}
              {guest.dietary_preferences?.length ? <DetailRow icon={Tag} label={t.dietary} value={guest.dietary_preferences.join(", ")} /> : null}
              {guest.drink_preferences && <DetailRow icon={Tag} label={t.drinks} value={guest.drink_preferences} />}
              {guest.music_preferences && <DetailRow icon={Tag} label={t.music} value={guest.music_preferences} />}
              {guest.relationship_notes && <DetailRow icon={Tag} label={t.relationNotes} value={guest.relationship_notes} />}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tags tab */}
        <TabsContent value="tags" className="flex-1 min-h-0 mt-0 px-4 pb-4">
          <ScrollArea className="h-full mt-2">
            <div className="space-y-2">
              {guest.tags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {language === "el" ? "Δεν υπάρχουν tags" : "No tags"}
                </p>
              ) : (
                guest.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border"
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-xs font-medium text-foreground">
                      {tag.emoji && <span className="mr-1">{tag.emoji}</span>}
                      {tag.name}
                    </span>
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-auto">
                      {tag.is_system ? "Auto" : "Custom"}
                    </Badge>
                  </div>
                ))
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
