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
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/app/button"
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Switch } from "@/components/ui/switch"
import axios from "axios"
import { toast } from "sonner"


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
  _id: z.string(),
  slug: z.string(),
  startTime: z.number(),
  // endTime: z.number(),
  // description: z.string(),
  // addressVisibility: z.string(),
  // geolocation_id: z.string(),
  // isFestival: z.boolean(),
  // name: z.string(),
  // featuredText: z.string(),
  // artworks: z.array(z.object({
  // })),
  // cancelledAt: z.number().optional(),
  // currency: z.string(),
  // tags: z.array(z.object({
  // })),
  // dealer_id: z.string(),
  // launchedAt: z.number(),
  // isSoldOut: z.boolean(),
  // minTicketPrice: z.number(),
  // created_at: z.date(),
  // updated_at: z.date(),
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
        toast.error("An error occurred");
      }
      console.log(response.data);
      
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <>
    <div className="flex flex-row">
    <Button  
    onClick={onBackClick}
    style={{ borderRadius: '50%', width: '90px', height: '90px', fontWeight: 'bold' }}
    className="block glow  hover:scale-110 transform transition duration-200 ease-in-out"        
    type="submit"> </Button>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="nom..." {...field} />
              </FormControl>
              <FormDescription>
                This is the name of your event.
              </FormDescription>
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
                {/* <Input placeholder="Describe your event..." {...field} /> */}
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
            />
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DemoContainer components={['DateTimePicker']}>
                    <DateTimePicker 
                      className="text-white"
                      label="Date et heures de Début" 
                      />
                  </DemoContainer>
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DemoContainer components={['DateTimePicker']}>
                    <DateTimePicker 
                      className="text-white"
                      label="Date et heures de fin" />
                  </DemoContainer>
                </LocalizationProvider>
                <FormField
                    control={form.control}
                    name="isFestival"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                    <FormDescription>
                      Votre soirée est t elle un festival ?
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
              name="description"
              render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                <Textarea placeholder="Describe your event" {...field} />
                {/* <Input placeholder="Describe your event..." {...field} /> */}
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
            />
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DemoContainer components={['DateTimePicker']}>
                    <DateTimePicker 
                      label="Date et heures de Début" 
                      />
                  </DemoContainer>
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DemoContainer components={['DateTimePicker']}>
                    <DateTimePicker 
                      label="Date et heures de fin" />
                  </DemoContainer>
                </LocalizationProvider>
                <FormField
                    control={form.control}
                    name="isFestival"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                    <FormDescription>
                      Votre soirée est t elle un festival ?
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
            

    </form>
    </Form>
    <Button  
        style={{ borderRadius: '50%', width: '90px', height: '90px', fontWeight: 'bold' }}
        className="block glow  hover:scale-110 transform transition duration-200 ease-in-out"        
        type="submit"> 
    </Button>
    </div>
    </>
  )
}

export default AddEventForm;