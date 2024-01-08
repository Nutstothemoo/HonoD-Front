import { parseCookies } from 'nookies';
import { useRouter } from 'next/router';
import React from 'react';

interface WithAuthProps {
  // Tu peux ajouter d'autres propriétés ici en fonction de tes besoins
}

// const WithAuth = (WrappedComponent: React.ComponentType<WithAuthProps>) => {
//   const Wrapper: React.FC<WithAuthProps> = (props) => {
//     const router = useRouter();

//     // Récupérer les cookies côté serveur
//     const cookies = parseCookies();

//     // Vérifier la présence du cookie d'authentification
//     const authToken = cookies['auth-token'];

//     // Rediriger vers la page de connexion si le cookie n'est pas présent
//     if (!authToken) {
//       // Assure-toi que tu utilises la version asPath du chemin
//       router.push('/login', undefined, { shallow: true });
//       return null;
//     }

//     // Si le cookie est présent, renvoyer le composant avec les props
//     return <WrappedComponent {...props} />;
//   };

//   return Wrapper;
// };

