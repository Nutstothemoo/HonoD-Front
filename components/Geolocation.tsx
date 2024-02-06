const GeolocationComponent: React.FC<GeolocationProps> = ({ geolocation }) => {
  if (!geolocation) return <p>Secret Location</p>;

  return (
    <div className="shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-row my-2">
      <p className="font-bold text-xl mb-2"><span className="font-normal">{geolocation.address}</span></p>
      <p className="font-bold text-xl mb-2"><span className="font-normal">{geolocation.city}</span></p>
      <p className="font-bold text-xl mb-2"><span className="font-normal">{geolocation.country}</span></p>
    </div>
  );
};

export default GeolocationComponent;


type GeolocationProps = {
  geolocation: {
    address: string;
    city: string;
    country: string;
  } | null;
};