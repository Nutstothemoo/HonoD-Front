"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner';

const RedirectGooglePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams() 
  let code :any, state: any;

  code = searchParams?.get('code') ?? '';
  state = searchParams?.get('state') ?? '';

  useEffect(() => {
    const fetchData = async () => {
        const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/google/callback?code=${code}&state=${state}`;
        const response = await fetch(backendURL);

        if (response.status === 200) {
          const data = await response.json(); 
          localStorage.setItem('user',JSON.stringify(data.user));
          router.push('/');
          toast.success('Vous êtes connecté');
        } else {
          router.push('/login');
          toast.error('Une erreur est survenue');          
        }
    };

    fetchData();
    }, );

  return (
    <div>
      <p>Redirection Google en cours...</p>
    </div>
  );
};

export default RedirectGooglePage;