import React, { useState } from 'react';

interface Profile {
  _id: string;
  firstname: string;
  lastname: string;
  avatar: string;
  facebookid: string | null;
  googleid: string;
  user_id: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  role: string;
  token: string;
  refresh_token: string;
  created_at: Date;
  updated_at: Date;
  dealerName: string;
}

const ProfileForm: React.FC = () => {
  const [profile, setProfile] = useState<Profile>({
    _id: '',
    firstname: '',
    lastname: '',
    avatar: '',
    facebookid: null,
    googleid: '',
    user_id: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: '',
    token: '',
    refresh_token: '',
    created_at: new Date(),
    updated_at: new Date(),
    dealerName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        First Name:
        <input type="text" name="firstname" value={profile.firstname} onChange={handleChange} />
      </label>
      <label>
        Last Name:
        <input type="text" name="lastname" value={profile.lastname} onChange={handleChange} />
      </label>
      <label>
        Email:
        <input type="email" name="email" value={profile.email} onChange={handleChange} />
      </label>
      <label>
        Phone:
        <input type="text" name="phone" value={profile.phone} onChange={handleChange} />
      </label>
      <button type="submit">Update Profile</button>
    </form>
  );
};

export default ProfileForm;



