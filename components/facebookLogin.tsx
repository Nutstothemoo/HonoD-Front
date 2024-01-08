import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/app/button"
import axios from 'axios';
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface RegisterFormData {
  password: string;
  confirmPassword: string;
  email: string;
}

const schema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
  email: z.string().email({ message: "Email must be a valid email." }),
  })

const FacebookLogin = ({onBackClick}: any) => {
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
  })
  const [email, setEmail] = useState("");
  const [password, setPasswordOne] = useState("");
  const [confirmPassword, setPasswordTwo] = useState("");
  const router = useRouter();
  const [error, setError] = useState(null);

  const onSubmit = (event:any) => {
    setError(null)
    //check if passwords match. If they do, create user in Firebase
    // and redirect to your logged in page.
    if(password === confirmPassword)
      createUserWithEmailAndPassword(auth , email, password)
      .then(authUser => {
        
        console.log(authUser, "authUser")
        console.log("Success. The user is created in Firebase")
      // if (response.status === 201) {
      //   toast.success("User Created");
      //   router.push("/dashboard")
      // } else {
      //   toast.error(`Error ${response.status}`);
      // }
        // router.push("/logged_in");
      })
      .catch(error => {
        // An error occurred. Set error message to be displayed to user
        setError(error.message)
      });
    else
      // setError("Password do not match")
    event.preventDefault();
  };

  return (
    <Form {...form}>
          <Button 
          style={{ borderRadius: '50%', width: '90px', height: '90px', fontWeight: 'bold' }}
          className="block glow  hover:scale-110 transform transition duration-200 ease-in-out" 
          onClick={onBackClick}>
          ⟨⟨⟨
    </Button>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="example@example.com" {...field} />
            </FormControl>
            <FormMessage className="text-red-500" />
          </FormItem>
        )}
      />
  <div className="flex space-x-4">
  <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
                />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm Password" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              /> 
        </div>  
        <Button className="block glow" type="submit"> </Button>
      </form>
    </Form>
  )
}

export default FacebookLogin;