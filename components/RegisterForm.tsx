"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/app/button"
import { toast } from "sonner"
import { useRouter } from 'next/router';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import axios from "axios"
interface RegisterFormData {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  phone: string;
}

const schema = z.object({
  firstName: z.string().min( 1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string().min(4, {
    message: "Password must be at least 8 characters.",
  }),
  email: z.string().email({ message: "Email must be a valid email." }),
  phone: z.string().min(1, { message: "Phone number is required." }),
  }).superRefine(({ confirmPassword, password }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "The passwords did not match"
    });
  }
});


export function RegisterForm({ onBackClick }: any) {
  const router = useRouter();
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/signup`, data);
      if (response.status === 201) {
        toast.success("User Created");
        router.push("/dashboard")
      } else {
        toast.error(`Error ${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
    <div className="flex flex-row">
    <Button  
      style={{ borderRadius: '50%', width: '90px', height: '90px', fontWeight: 'bold' }}
      className="block glow  hover:scale-110 transform transition duration-200 ease-in-out"        
      onClick={onBackClick}
    > ⟨⟨⟨
    </Button>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public username on Honod.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
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
      
<div className="flex space-x-4">
<FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <FormControl>
              <Input placeholder="First Name" {...field} />
            </FormControl>
            <FormMessage className="text-red-500" />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name</FormLabel>
            <FormControl>
              <Input placeholder="Last Name" {...field} />
            </FormControl>
            <FormMessage className="text-red-500" />
          </FormItem>
        )}
      />
</div>

      <FormField
          control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Numéro de téléphone</FormLabel>
      <FormControl>
        <Input type="phone" placeholder="+ 33" {...field} />
      </FormControl>
      <FormMessage className="text-red-500" />
    </FormItem>
        )}
      />
            <Button  
        style={{ borderRadius: '50%', width: '90px', height: '90px', fontWeight: 'bold' }}
        className="block glow  hover:scale-110 transform transition duration-200 ease-in-out"        
        type="submit"> 
      </Button>
      </form>
    </Form>
    </div>
    </>
  )
}

export default RegisterForm;