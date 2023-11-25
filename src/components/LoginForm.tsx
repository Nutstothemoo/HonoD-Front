import React, { useEffect, useState } from 'react';
import { token } from '../utils/token';
import { useRouter } from 'next/router'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { setCookie } from 'nookies';
import axios from 'axios';



interface LoginFormProps {
  onFormSubmit: (username: string, password: string) => any;
}


function LoginForm({ onFormSubmit }: LoginFormProps)  {
  const [error, setError] = useState('');
  const router = useRouter()
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (token) {
      router.push('/dashboard')
    }
  }, [])

 const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Required'),
      password: Yup.string().required('Required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const response = await axios.post('/api/login', {
          password: values.password,
          username: values.username,
        });
    
        const { auth_token } = response.data;
    
        setCookie(null, 'auth-token', auth_token, {
          path: '/',
          sameSite: 'strict',
          maxAge: 3 * 24 * 60 * 60, // expires in 3 days
        });
    
        setSuccess('Logged in successfully!');
        router.push('/dashboard', undefined, { shallow: true });
      } catch (error :any) {
        if (error.response) {
          const { non_field_errors: requestError } = error.response.data;
          setError(requestError);
        }
      }
    
      setSubmitting(false);
    },
  });
  
  return (
    <div className="items-center justify-center" >
    <form
    className="flex flex-col rounded-lg" 
    onSubmit={formik.handleSubmit}
    >
      <label className="block text-sm font-bold">
        Nom d`&#39;` utilisateur:
        <input 
          className="w-full px-3 py-2 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" 
          type="text" 
          name="username" 
          // value={username} 
          value={formik.values.username}
          onChange={formik.handleChange}
          />
      </label>
      <label className="block  text-sm font-bold">
        Mot de passe:
        <input className="w-full px-3 py-2 mb-3 leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline" 
          type="password" 
          name="password" 
          value={formik.values.username}
          onChange={formik.handleChange}
          />
      </label>
        {error && <p className="text-red-500">{error}</p>}
        {/* {error ? <AlertComponent type="error" message={error} /> : null} */}
        {/* {success ? <AlertComponent type="success" message={success} /> : null} */}

      <input 
      className="px-4 py-2 font-bold rounded-full focus:outline-none focus:shadow-outline" 
      type="submit" 
      value="S'inscrire" />
    </form>
    </div>
  );
}

export default LoginForm;