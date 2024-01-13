import React from 'react';
interface ButtonProps {
  text: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string
}
const ButtonEvent: React.FC<ButtonProps> = ({ text, onClick , className}) => {

  return (
      <button 
      className={`rounded block glow ${className}`}
      onClick={onClick}>
      {text}
    </button>
  );
}

export default ButtonEvent;
