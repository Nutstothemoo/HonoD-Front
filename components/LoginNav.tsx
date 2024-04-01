import React, { useState } from 'react';
import LoginForm from './LoginForm';
import axios from 'axios';
import RegisterForm from './RegisterForm';
import Button from './atoms/Button';
import { motion } from 'framer-motion';
import {toast} from 'sonner';

function LoginNav( ) {
  const [showLoginForm, setShowLonginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showFacebookLogin, setShowFacebookLogin] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);  
  const [showButtons, setShowButtons] = useState(true);

  const handleGoogleLogin = async () => {
    setShowGoogleLogin(prevShowForm => !prevShowForm);
    if (showFacebookLogin) setShowFacebookLogin(false);
    if (showButtons) setShowButtons(false);
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/login/google`);
    if (response.status === 200) {
      const url = response.data.url;
      window.location.href = url;
    } else {
      setShowButtons(true);
      toast.error("Google login failed");
    }
  };  
  const handleFacebookLogin = async () => {
    setShowFacebookLogin(prevShowForm => !prevShowForm);
    if (showGoogleLogin) setShowGoogleLogin(false);
    if (showButtons) setShowButtons(false);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/login/facebook`);

      if (response.status === 200) {
        const url = response.data.url;
        window.location.href = url;
      } else {
        setShowButtons(true);
        toast.error("Facebook login failed");
      }
    } catch (error) {
      setShowButtons(true);
      toast.error("Facebook login failed");
    }
  };

  const handleInternalLogin = () => {
    setShowLonginForm(prevShowForm => !prevShowForm);
    if (showRegisterForm) setShowRegisterForm(false);
    if (showButtons) setShowButtons(false);
  };
  const handleInternalRegister = () => {
    setShowRegisterForm(prevShowForm => !prevShowForm);
    if (showLoginForm) setShowLonginForm(false);
    if (showButtons) setShowButtons(false);
  };


  const handleBackClick = () => {
    setShowButtons(true);
    if (showLoginForm) setShowLonginForm(false);
    if(showRegisterForm) setShowRegisterForm(false);
    if(showGoogleLogin) setShowGoogleLogin(false);
    if(showFacebookLogin) setShowFacebookLogin(false);
  };

  return (
    <>
    {!false && (
      <section className="text-white py-16">
        <motion.div 
        className="container mx-auto text-center"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        >
        <h2 className="text-4xl font-extrabold">
            {showButtons && 'Connectez-vous'}
            {showGoogleLogin && 'Connectez-vous avec Google'}
            {showFacebookLogin && 'Connectez-vous avec Meta'}
            {showLoginForm && 'Connectez-vous avec votre compte'}
            {showRegisterForm && 'Créez un nouveau compte'}
          </h2>
          <p className="text-lg mt-4">
            {showButtons && 'Choisissez votre méthode de connexion préférée.'}
            {showGoogleLogin && 'Veuillez vous connecter avec votre compte Google.'}
            {showFacebookLogin && 'Veuillez vous connecter avec votre compte Meta.'}
            {showLoginForm && 'Veuillez entrer vos informations de connexion.'}
            {showRegisterForm && 'Veuillez entrer vos informations pour créer un nouveau compte.'}
          </p>
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mt-9 gap-6">
            {showButtons ? (
              <>          
              <motion.div 
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration:1, ease: "easeOut" }}
                className="flex flex-col sm:flex-row sm:flex-wrap justify-between">
                <div className="flex flex-col sm:flex-col gap-6 mb-6 sm:mb-0">
                  <Button size="medium" text="Google" onClick={handleGoogleLogin} />
                  <Button size="medium" text="Meta" onClick={handleFacebookLogin} />
                </div>
                <div className="flex flex-col sm:flex-col gap-6">
                  <Button size="medium" text="Login" onClick={handleInternalLogin} />
                  <Button size="medium" text="Register" onClick={handleInternalRegister} />
                </div>
              </motion.div>
              </>
            ) : (
              ""
            )}
            {showRegisterForm && (<RegisterForm  onBackClick={handleBackClick} />)}
            {showLoginForm && (
              <LoginForm onBackClick={handleBackClick}/>
            )}
          </motion.div>
        </motion.div>
      </section>
    )}
    </>
  );
}

export default LoginNav;