"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/app/button"
import axios from 'axios';
import { toast } from "sonner"

// import Button from "@/components/atoms/Button"
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

interface LoginData {
  email: string;
  password: string;
}

const schema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  email: z.string().email({ message: "Email must be a valid email." }),
});


function LoginForm({ onBackClick }: any)   {
   const form = useForm<LoginData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/login`, data);
      if (response.status === 200) {
        toast.success("Connected");
      } else {
        toast.error("An error occurred");
      }      
    } catch (error) {
      console.error(error);
    }
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
        <Button className="block glow" type="submit"> </Button>
      </form>
    </Form>
  )
}

export default LoginForm;