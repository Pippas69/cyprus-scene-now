import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'error' | 'success'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === 'already_unsubscribed') setStatus('already');
        else if (d.valid) setStatus('valid');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    try {
      const { data } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          {status === 'success' ? 'Απεγγράφηκες' : status === 'already' ? 'Ήδη απεγγεγραμμένος/η' : 'Απεγγραφή από emails'}
        </h1>
        {status === 'loading' && <p className="text-muted-foreground">Φόρτωση...</p>}
        {status === 'valid' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">Θέλεις να σταματήσεις να λαμβάνεις emails από το ΦΟΜΟ;</p>
            <button onClick={handleUnsubscribe} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold">
              Επιβεβαίωση Απεγγραφής
            </button>
          </div>
        )}
        {status === 'success' && <p className="text-muted-foreground">Δεν θα λαμβάνεις πλέον emails από εμάς.</p>}
        {status === 'already' && <p className="text-muted-foreground">Έχεις ήδη απεγγραφεί από τα emails μας.</p>}
        {status === 'error' && <p className="text-destructive">Κάτι πήγε στραβά. Ο σύνδεσμος μπορεί να μην είναι έγκυρος.</p>}
      </div>
    </div>
  );
};

export default Unsubscribe;
