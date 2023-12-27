import React, { useState } from 'react';
import LoginForm from './LoginForm';
import axios from 'axios';
import RegisterForm from './RegisterForm';
import Button from './atoms/Button';


function LoginNav() {
  const [showLoginForm, setShowLonginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showLoginNav, setShowLoginNav] = useState(false); // [1
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showButtons, setShowButtons] = useState(true);

  const handleGoogleLogin = () => {
    console.log('Se connecter via Google');
  };

  const handleFacebookLogin = () => {
    console.log('Se connecter via Facebook');
  };

  const handleInternalLogin = () => {
    setShowLonginForm(prevShowForm => !prevShowForm);
    if (showRegisterForm) setShowRegisterForm(false);
    if (showButtons) setShowButtons(false);
  };

  const handleInternalRegister = () => {
    setShowLoginNav(prevShowLoginNav => !prevShowLoginNav);
    setShowRegisterForm(prevShowForm => !prevShowForm);
    if (showLoginForm) setShowLonginForm(false);
    if (showButtons) setShowButtons(false);
  };

  const handleFormSubmit = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${process.env.BACK_END_URL}/login`, {
        username,
        password,
      });

      if (response.status === 200) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const handleRegisterFormSubmit = async (user: { firstName: string, lastName: string, username: string, password: string, email: string, phone: string }) => {
    try {
      const response = await axios.post(`${process.env.BACK_END_URL}/register`, {
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
        password: user.password,
        email: user.email,
        phone: user.phone,
      });
  
      if (response.status === 200) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const handleBackClick = () => {
    setShowButtons(true);
    if (showLoginForm) setShowLonginForm(false);
    if(showRegisterForm) setShowRegisterForm(false);
  };

  return (
    <>
    {!isLoggedIn && (
      <section className="text-white py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-extrabold">Connectez-vous</h2>
          <p className="text-lg mt-4">
            Choisissez votre méthode de connexion préférée.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {showButtons ? (
              <>
                <Button size="medium" text="Se connecter via Google" onClick={handleGoogleLogin} />
                <Button size="medium" text="Se connecter via Facebook" onClick={handleFacebookLogin} />
                <Button size="medium" text="Se connecter via HonoD" onClick={handleInternalLogin} />
                <Button size="large" text="S'inscrire" onClick={handleInternalRegister} />
              </>
            ) : (
              <Button size="medium" text="⟨ Retour" onClick={handleBackClick} />
            )}
            {showRegisterForm && (<RegisterForm onFormSubmit={handleRegisterFormSubmit} />)}
            {showLoginForm && (<LoginForm onFormSubmit={handleFormSubmit} />)}

          </div>
        </div>
      </section>
    )}
    </>
  );
}

export default LoginNav;