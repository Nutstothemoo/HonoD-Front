import React, { useState } from 'react';
import Button from './atoms/Button';

interface RegisterFormProps {
  onFormSubmit: (user: any) => any;
}



function RegisterForm({ onFormSubmit }: RegisterFormProps) {

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!firstName || !lastName || !username || !password || !confirmPassword || !email || !phone) {
      setError('Veuillez remplir tous les champs');
    } else if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
    } else {
      onFormSubmit({ firstName, lastName, username, password, email, phone });
    }
  };

  return (
    <div className="items-center justify-center">
      <form className="flex flex-col rounded-lg" onSubmit={handleSubmit}>
        <div className='flex flex-row'>
        <label className="text-sm font-bold">
          Prénom:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="text-sm font-bold">
          Nom de famille:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        </div>
        <label className="text-sm font-bold">
          Nom d&#39;utilisateur:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="text-sm font-bold">
          Mot de passe:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="text-sm font-bold">
          Confirmer le mot de passe:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>
        <label className="text-sm font-bold">
          Email:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm font-bold">
          Téléphone:
          <input className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {error && <p className="text-red-500">{error}</p>}
        <Button text="submit" size="small" onClick={handleSubmit} />
        </form>
      </div>
  );
}  
export default RegisterForm;

