// Types for multi-item offers (simplified)

export type PricingType = 'single' | 'bundle';

export interface OfferItem {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface MultiItemOfferData {
  pricing_type: PricingType;
  bundle_price_cents?: number;
  items: OfferItem[];
}

// For saved items from database
export interface SavedDiscountItem {
  id: string;
  discount_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

// Translations
export const offerItemTranslations = {
  en: {
    pricingType: "Offer Type",
    singleItem: "Single Item",
    singleItemDesc: "One item with a discount",
    bundleOffer: "Bundle Offer",
    bundleDesc: "Multiple items for one fixed price",
    whatsIncluded: "What's Included",
    addItem: "Add Item",
    itemName: "Item Name",
    itemNamePlaceholder: "e.g., Product, Service, Package",
    itemDescription: "Description (optional)",
    itemDescPlaceholder: "Describe this item...",
    bundlePrice: "Bundle Price (€)",
    bundlePriceDesc: "Total price for the entire bundle",
    itemsIncluded: "items included",
    removeItem: "Remove item",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  el: {
    pricingType: "Τύπος Προσφοράς",
    singleItem: "Μεμονωμένο Προϊόν",
    singleItemDesc: "Ένα προϊόν με έκπτωση",
    bundleOffer: "Πακέτο Προσφοράς",
    bundleDesc: "Πολλά προϊόντα για μία σταθερή τιμή",
    whatsIncluded: "Τι Περιλαμβάνεται",
    addItem: "Προσθήκη",
    itemName: "Όνομα",
    itemNamePlaceholder: "π.χ., Προϊόν, Υπηρεσία, Πακέτο",
    itemDescription: "Περιγραφή (προαιρετικό)",
    itemDescPlaceholder: "Περιγράψτε το προϊόν...",
    bundlePrice: "Τιμή Πακέτου (€)",
    bundlePriceDesc: "Συνολική τιμή για όλο το πακέτο",
    itemsIncluded: "προϊόντα",
    removeItem: "Αφαίρεση",
    moveUp: "Μετακίνηση πάνω",
    moveDown: "Μετακίνηση κάτω",
  },
};
