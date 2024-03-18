'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const RedirectFacebookPage = async () => {
  const router = useRouter();
  const searchParams = useSearchParams() 
  let code :any, state: any;

  code = searchParams?.get('code') ?? '';
  state = searchParams?.get('state') ?? '';


  const fetchData = async () => {
        const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback?code=${code}&state=${state}`;
        const response = await fetch(backendURL);
        if (response.ok) {          
          const data = await response.json(); 
          router.push('/');
          toast.success('Vous êtes connecté');
        } else {
          router.push('/login');
          toast.error('Une erreur est survenue');          
        }
    };

  await fetchData();


  return (
    <div>
      <p>Redirection Facebook en cours...</p>
    </div>
  );
};

export default RedirectFacebookPage;