"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const RedirectFacebookPage = () => {
  const router = useRouter();
    let code :any, state: any;
    const searchParams = useSearchParams() 
    code = searchParams?.get('code') ?? '';
    state = searchParams?.get('state') ?? '';

  useEffect(() => {
    const fetchData = async () => {
        const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback?code=${code}&state=${state}`;
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
    }, [code, state, router]);

  return (
    <div>
      <p>Redirection Facebook en cours...</p>
    </div>
  );
};

export default RedirectFacebookPage;

//  code qui marche pas et qui fait des millier de request pour rien mais solution pas terrible
// 'use client'
// import { useRouter } from 'next/navigation';
// import { useSearchParams } from 'next/navigation';
// import { toast } from 'sonner';

// const RedirectFacebookPage = async () => {
//   const router = useRouter();
//   const searchParams = useSearchParams() 
//   let code :any, state: any;

//   code = searchParams?.get('code') ?? '';
//   state = searchParams?.get('state') ?? '';


//   const fetchData = async () => {
//         const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback?code=${code}&state=${state}`;
//         const response = await fetch(backendURL);
//         if (response.ok) {          
//           router.push('/');
//           toast.success('Vous êtes connecté');
//         } else {
//           router.push('/login');
//           toast.error('Une erreur est survenue');          
//         }
//   };

//   await fetchData();


//   return (
//     <div>
//       <p>Redirection Facebook en cours...</p>
//     </div>
//   );
// };

// export default RedirectFacebookPage;