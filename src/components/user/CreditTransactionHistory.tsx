import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreditTransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
  language: "el" | "en";
}

interface CreditTransaction {
  id: string;
  amount_cents: number;
  transaction_type: 'purchase' | 'redemption' | 'refund';
  balance_before_cents: number;
  balance_after_cents: number;
  notes: string | null;
  created_at: string;
}

const translations = {
  en: {
    title: "Transaction History",
    noTransactions: "No transactions yet",
    purchase: "Initial Credit",
    redemption: "Used at venue",
    refund: "Refund",
    balanceAfter: "Balance after",
  },
  el: {
    title: "Ιστορικό Συναλλαγών",
    noTransactions: "Δεν υπάρχουν συναλλαγές ακόμα",
    purchase: "Αρχική Πίστωση",
    redemption: "Χρήση στο κατάστημα",
    refund: "Επιστροφή",
    balanceAfter: "Υπόλοιπο μετά",
  },
};

export function CreditTransactionHistory({ isOpen, onClose, purchaseId, language }: CreditTransactionHistoryProps) {
  const t = translations[language];

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["credit-transactions", purchaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("purchase_id", purchaseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: isOpen && !!purchaseId,
  });

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'purchase': return t.purchase;
      case 'redemption': return t.redemption;
      case 'refund': return t.refund;
      default: return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'redemption': return <ArrowDownRight className="h-4 w-4 text-orange-600" />;
      case 'refund': return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t.noTransactions}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getTransactionIcon(tx.transaction_type)}</div>
                    <div>
                      <p className="font-medium text-sm">{getTransactionLabel(tx.transaction_type)}</p>
                      {tx.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tx.created_at), language === "el" ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={tx.transaction_type === 'redemption' ? 'destructive' : 'default'}
                      className="text-sm font-mono"
                    >
                      {tx.transaction_type === 'redemption' ? '-' : '+'}€{(tx.amount_cents / 100).toFixed(2)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.balanceAfter}: €{(tx.balance_after_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
