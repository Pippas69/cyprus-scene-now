export const validationTranslations = {
  el: {
    // Common field validation
    required: "Αυτό το πεδίο είναι υποχρεωτικό",
    invalidEmail: "Μη έγκυρη διεύθυνση email",
    invalidPhone: "Μη έγκυρος αριθμός τηλεφώνου",
    invalidUrl: "Μη έγκυρη διεύθυνση URL",
    
    // Password validation
    passwordMin: "Ο κωδικός πρέπει να έχει τουλάχιστον {min} χαρακτήρες",
    passwordsNoMatch: "Οι κωδικοί δεν ταιριάζουν",
    passwordTooShort: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες",
    
    // String length validation
    minLength: "Πρέπει να έχει τουλάχιστον {min} χαρακτήρες",
    maxLength: "Δεν πρέπει να υπερβαίνει τους {max} χαρακτήρες",
    
    // Number validation
    minValue: "Η ελάχιστη τιμή είναι {min}",
    maxValue: "Η μέγιστη τιμή είναι {max}",
    positiveNumber: "Η τιμή πρέπει να είναι θετική",
    
    // Date validation
    invalidDate: "Μη έγκυρη ημερομηνία",
    dateInPast: "Η ημερομηνία δεν μπορεί να είναι στο παρελθόν",
    dateInFuture: "Η ημερομηνία δεν μπορεί να είναι στο μέλλον",
    endBeforeStart: "Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης",
    
    // File validation
    fileTooLarge: "Το αρχείο είναι πολύ μεγάλο (μέγιστο {max}MB)",
    invalidFileType: "Μη έγκυρος τύπος αρχείου. Επιτρέπονται: {types}",
    
    // Selection validation
    selectOption: "Παρακαλώ επιλέξτε μία επιλογή",
    minSelection: "Επιλέξτε τουλάχιστον {min} στοιχεία",
    maxSelection: "Επιλέξτε έως {max} στοιχεία",
    
    // Business specific
    nameRequired: "Το όνομα είναι υποχρεωτικό",
    descriptionTooLong: "Η περιγραφή πρέπει να είναι έως 500 χαρακτήρες",
    addressRequired: "Η διεύθυνση είναι υποχρεωτική",
    categoryRequired: "Επιλέξτε τουλάχιστον μία κατηγορία",
    cityRequired: "Η πόλη είναι υποχρεωτική",
    
    // Event specific
    titleRequired: "Ο τίτλος είναι υποχρεωτικός",
    locationRequired: "Η τοποθεσία είναι υποχρεωτική",
    invalidCapacity: "Η χωρητικότητα πρέπει να είναι μεγαλύτερη από 0",
    
    // Reservation specific
    partySize: "Ο αριθμός ατόμων πρέπει να είναι τουλάχιστον 1",
    nameRequiredReservation: "Το όνομα για την κράτηση είναι υποχρεωτικό",
    phoneRequired: "Το τηλέφωνο είναι υποχρεωτικό",
  },
  en: {
    // Common field validation
    required: "This field is required",
    invalidEmail: "Invalid email address",
    invalidPhone: "Invalid phone number",
    invalidUrl: "Invalid URL",
    
    // Password validation
    passwordMin: "Password must be at least {min} characters",
    passwordsNoMatch: "Passwords don't match",
    passwordTooShort: "Password must be at least 6 characters",
    
    // String length validation
    minLength: "Must be at least {min} characters",
    maxLength: "Must not exceed {max} characters",
    
    // Number validation
    minValue: "Minimum value is {min}",
    maxValue: "Maximum value is {max}",
    positiveNumber: "Value must be positive",
    
    // Date validation
    invalidDate: "Invalid date",
    dateInPast: "Date cannot be in the past",
    dateInFuture: "Date cannot be in the future",
    endBeforeStart: "End date must be after start date",
    
    // File validation
    fileTooLarge: "File is too large (maximum {max}MB)",
    invalidFileType: "Invalid file type. Allowed: {types}",
    
    // Selection validation
    selectOption: "Please select an option",
    minSelection: "Select at least {min} items",
    maxSelection: "Select up to {max} items",
    
    // Business specific
    nameRequired: "Name is required",
    descriptionTooLong: "Description must be up to 500 characters",
    addressRequired: "Address is required",
    categoryRequired: "Select at least one category",
    cityRequired: "City is required",
    
    // Event specific
    titleRequired: "Title is required",
    locationRequired: "Location is required",
    invalidCapacity: "Capacity must be greater than 0",
    
    // Reservation specific
    partySize: "Party size must be at least 1",
    nameRequiredReservation: "Name for reservation is required",
    phoneRequired: "Phone number is required",
  },
};

// Helper function to replace placeholders in validation messages
export const formatValidationMessage = (message: string, params: Record<string, any> = {}) => {
  return message.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
};
