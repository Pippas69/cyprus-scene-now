import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, User } from "lucide-react";

export interface CastMember {
  person_name: string;
  role_type: string;
  role_name: string;
  bio: string;
  sort_order: number;
}

interface CastCrewEditorProps {
  members: CastMember[];
  onMembersChange: (members: CastMember[]) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    castCrew: "Ηθοποιοί & Συντελεστές",
    addMember: "Προσθήκη",
    name: "Όνομα",
    roleType: "Τύπος",
    roleName: "Ρόλος",
    actor: "Ηθοποιός",
    director: "Σκηνοθέτης",
    musician: "Μουσικός",
    dancer: "Χορευτής",
    conductor: "Μαέστρος",
    crew: "Πλήρωμα",
    other: "Άλλο",
    namePlaceholder: "Ονοματεπώνυμο",
    rolePlaceholder: "π.χ. Πρωταγωνιστής",
    empty: "Δεν έχουν προστεθεί συντελεστές",
  },
  en: {
    castCrew: "Cast & Crew",
    addMember: "Add Member",
    name: "Name",
    roleType: "Type",
    roleName: "Role",
    actor: "Actor",
    director: "Director",
    musician: "Musician",
    dancer: "Dancer",
    conductor: "Conductor",
    crew: "Crew",
    other: "Other",
    namePlaceholder: "Full name",
    rolePlaceholder: "e.g. Lead Role",
    empty: "No cast or crew added yet",
  },
};

const roleTypes = ['actor', 'director', 'musician', 'dancer', 'conductor', 'crew', 'other'] as const;

export const CastCrewEditor: React.FC<CastCrewEditorProps> = ({ members, onMembersChange, language }) => {
  const t = translations[language];

  const addMember = () => {
    onMembersChange([
      ...members,
      {
        person_name: '',
        role_type: 'actor',
        role_name: '',
        bio: '',
        sort_order: members.length,
      },
    ]);
  };

  const updateMember = (index: number, updates: Partial<CastMember>) => {
    const updated = members.map((m, i) => (i === index ? { ...m, ...updates } : m));
    onMembersChange(updated);
  };

  const removeMember = (index: number) => {
    onMembersChange(members.filter((_, i) => i !== index).map((m, i) => ({ ...m, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          {t.castCrew}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addMember} className="text-xs h-7 sm:h-8">
          <Plus className="h-3 w-3 mr-1" />
          {t.addMember}
        </Button>
      </div>

      {members.length === 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          {t.empty}
        </p>
      )}

      <div className="space-y-2">
        {members.map((member, index) => (
          <div key={index} className="flex items-start gap-1.5 sm:gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg border">
            <GripVertical className="h-4 w-4 text-muted-foreground mt-2 flex-shrink-0 hidden sm:block" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
              <Input
                value={member.person_name}
                onChange={(e) => updateMember(index, { person_name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="text-xs sm:text-sm h-8 sm:h-9"
              />
              <Select
                value={member.role_type}
                onValueChange={(v) => updateMember(index, { role_type: v })}
              >
                <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleTypes.map((rt) => (
                    <SelectItem key={rt} value={rt} className="text-xs sm:text-sm">
                      {t[rt as keyof typeof t] || rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={member.role_name}
                onChange={(e) => updateMember(index, { role_name: e.target.value })}
                placeholder={t.rolePlaceholder}
                className="text-xs sm:text-sm h-8 sm:h-9"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMember(index)}
              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive flex-shrink-0"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
