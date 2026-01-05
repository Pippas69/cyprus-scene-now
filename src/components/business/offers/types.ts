// Types for multi-item offers

export type PricingType = 'single' | 'bundle' | 'itemized';

export interface OfferItemOption {
  id: string;
  name: string;
  description?: string;
  price_cents?: number;
  image_url?: string;
  sort_order: number;
}

export interface OfferItem {
  id: string;
  name: string;
  description?: string;
  price_cents?: number;
  image_url?: string;
  is_choice_group: boolean;
  sort_order: number;
  options: OfferItemOption[];
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
  price_cents: number | null;
  image_url: string | null;
  is_choice_group: boolean;
  sort_order: number;
  created_at: string;
  discount_item_options?: SavedDiscountItemOption[];
}

export interface SavedDiscountItemOption {
  id: string;
  discount_item_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

// Translations
export const offerItemTranslations = {
  en: {
    pricingType: "Offer Type",
    singleItem: "Single Item",
    singleItemDesc: "One item with a discount",
    bundleDeal: "Bundle Deal",
    bundleDesc: "Fixed price for multiple items",
    itemizedCombo: "Itemized Combo",
    itemizedDesc: "Sum of individual item prices",
    items: "Items",
    addItem: "Add Item",
    itemName: "Item Name",
    itemNamePlaceholder: "e.g., Main Course, Appetizer",
    itemDescription: "Description (optional)",
    itemDescPlaceholder: "Describe this item...",
    itemPrice: "Price (€)",
    hasOptions: "Customer can choose",
    hasOptionsDesc: "Let customers pick from options",
    options: "Options",
    addOption: "Add Option",
    optionName: "Option Name",
    optionNamePlaceholder: "e.g., Grilled Salmon, Pasta",
    optionPrice: "Price Difference (€)",
    bundlePrice: "Bundle Price (€)",
    bundlePriceDesc: "Total price for the entire bundle",
    itemsIncluded: "items included",
    removeItem: "Remove item",
    removeOption: "Remove option",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  el: {
    pricingType: "Τύπος Προσφοράς",
    singleItem: "Μεμονωμένο Προϊόν",
    singleItemDesc: "Ένα προϊόν με έκπτωση",
    bundleDeal: "Πακέτο",
    bundleDesc: "Σταθερή τιμή για πολλά προϊόντα",
    itemizedCombo: "Κατάλογος Προϊόντων",
    itemizedDesc: "Άθροισμα τιμών προϊόντων",
    items: "Προϊόντα",
    addItem: "Προσθήκη Προϊόντος",
    itemName: "Όνομα Προϊόντος",
    itemNamePlaceholder: "π.χ., Κύριο Πιάτο, Ορεκτικό",
    itemDescription: "Περιγραφή (προαιρετικό)",
    itemDescPlaceholder: "Περιγράψτε το προϊόν...",
    itemPrice: "Τιμή (€)",
    hasOptions: "Ο πελάτης επιλέγει",
    hasOptionsDesc: "Επιτρέψτε επιλογές στους πελάτες",
    options: "Επιλογές",
    addOption: "Προσθήκη Επιλογής",
    optionName: "Όνομα Επιλογής",
    optionNamePlaceholder: "π.χ., Σολομός Σχάρας, Ζυμαρικά",
    optionPrice: "Διαφορά Τιμής (€)",
    bundlePrice: "Τιμή Πακέτου (€)",
    bundlePriceDesc: "Συνολική τιμή για όλο το πακέτο",
    itemsIncluded: "προϊόντα περιλαμβάνονται",
    removeItem: "Αφαίρεση προϊόντος",
    removeOption: "Αφαίρεση επιλογής",
    moveUp: "Μετακίνηση πάνω",
    moveDown: "Μετακίνηση κάτω",
  },
};
