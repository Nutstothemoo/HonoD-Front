import EventCard from './atoms/EventCard';

export interface Event {
  id: string;
  title: string;
  thumbnailUrl?: string;
  description: string;
}


interface EventListProps {
  events: Event[];
}

const EventList: React.FC<EventListProps> = ({ events }) => (
  <main className="w-full px-20 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {events.map((event) => (
      <EventCard key={event.id} event={event} />
    ))}
  </main>
);

export default EventList;