'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const RedirectFacebookPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams() 
  let code :any, state: any;

  code = searchParams?.get('code') ?? '';
  state = searchParams?.get('state') ?? '';

  useEffect(() => {
    const fetchData = async () => {
        const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback?code=${code}&state=${state}`;
        const response = await fetch(backendURL);

        if (response.status === 200) {
          const data = await response.json(); 
          localStorage.setItem('user',JSON.stringify(data.user));;
          router.push('/dashboard');
          toast.success('Vous êtes connecté');
        } else {
          router.push('/');
          toast.error('Une erreur est survenue');          
        }
    };

    fetchData();
    }, );

  return (
    <div>
      <p>Redirection Facebook en cours...</p>
    </div>
  );
};

export default RedirectFacebookPage;