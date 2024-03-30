// DealerComponent.tsx
import Image from 'next/image';
import React from 'react';

type DealerProps = {
  dealer: {
    dealerName: string;
    avatar: string;
  } | null;
};

const DealerComponent: React.FC<DealerProps> = ({ dealer }) => {
  if (!dealer) return <p>No dealer information available.</p>;

  return (
    <div className="flex items-center shadow-md rounded px-8 pt-6 pb-8 mb-4 my-2">        
      <Image className="w-16 h-16 rounded-full mr-4" src={dealer.avatar} alt="Dealer Avatar" />
      <p className="font-bold text-xl"> Par <span className="font-normal">{dealer.dealerName}</span></p>
    </div>
  );
};

export default DealerComponent;