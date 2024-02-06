'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';

const RedirectFacebookPage = () => {
  const [hasRequested, setHasRequested] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();


  useEffect(() => {
    if (typeof window !== 'undefined' && !hasRequested) {
      console.log('hasRequested is false');
      let code, state;
      code = searchParams?.get('code') ?? '';
      state = searchParams?.get('state') ?? '';  

    if (code && state) {
      setHasRequested(true);
    const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback?code=${code}&state=${state}`;
      fetch(backendURL)
      .then((response: any) => {
        if (response.status === 200) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Vous êtes connecté');
        } else {
          toast.error('Une erreur est survenue');
        }
      })
      .catch(error => {
        console.error(error);
        toast.error('Une erreur est survenue');
      });
      }
    }
  }, [hasRequested]);
  

  return (
    <div>
      <p>Redirection Facebook en cours...</p>
    </div>
  );
};

export default RedirectFacebookPage;
    


