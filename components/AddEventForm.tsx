"use client"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Textarea } from "@/components/ui/textarea"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Switch } from "@/components/ui/switch"
import axios from "axios"
import { toast } from "sonner"
// import { DatePicker1Presentation } from "./DatePicker"

interface EventData {
  Country: string;
  description: string;
  addressVisibility: string;
  geolocation: object;
  isFestival: boolean;
  startTime: number;
  endTime: number;
  name: string;
  featuredText: string;
  artworks: any[];
  tags: any[];
  launchedAt: number;
}

const schema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  addressVisibility: z.string(),
  timezone: z.string(),
  description: z.string(),
  geolocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    city: z.string(),
    country: z.string(),
  }),
  isFestival: z.boolean(),
  name: z.string(),
  featuredText: z.string(),
  artworks: z.array(z.object({
  })),
  currency: z.string(),
  tags: z.array(z.object({
  })),
  launchedAt: z.date(),
  isSoldOut: z.boolean(),
  });

export function AddEventForm({onBackClick}:any) {
  const form = useForm<EventData>({
    resolver: zodResolver(schema),
  })
  const onSubmit = async (event: EventData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/dealer/events`, event);
      if (response.status === 200) {
        toast.success("Connected");
      } else {
        toast.error("Event not created, an error occurred");
      }
    } catch (error) {
      toast.error("Error connecting to the server");
    }
  };
  
  return (
    <>
    <div className="flex flex-row border-white">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                <Textarea placeholder="Describe your event" {...field} />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
            />
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      className="rounded-lg shadow-sm p-3"
                      label="Date et heures de Début" 
                      />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker 
                      className="color-white rounded-lg shadow-sm p-3"
                    label="Date et heures de fin" />
                </LocalizationProvider>
                <FormField
                    control={form.control}
                    name="isFestival"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                    <FormDescription>
                      is your Event a festival?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
                )}
                />
          <FormField
          control={form.control}
          name="addressVisibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Adresse visibility
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified email to display" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="private"> private</SelectItem>
                  <SelectItem value="public"> public </SelectItem>
                  <SelectItem value="public 24h"> public 24h</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the visibility of the address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
          />
      </form>
    </Form>
    {/* <DatePicker1Presentation /> */}
    </div>
    </>
  )
}

export default AddEventForm;