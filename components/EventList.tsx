import EventCard from './atoms/EventCard';

export interface Event {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: any[];
  slug: string;
  dealer?: string;  
  minTicketPrice?:number;
  startTime: string; // Add this line
  endTime: string; //  
}

interface EventListProps {
  events: Event[];
}

const EventList: React.FC<EventListProps> = ({ events }) => (
  <main className="w-full md:px-10 lg:px-20 mx-auto flex flex-wrap ">
    {events.map((event) => (
        <EventCard key={event._id} event={event} />
    ))}
  </main>
);

export default EventList;