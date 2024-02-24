import React from 'react';
interface ButtonProps {
  text: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size: 'small' | 'medium' | 'large';
}
const Button: React.FC<ButtonProps> = ({ text, onClick , size}) => {
  let sizeClasses = '';

  switch (size as string) {
    case 'small':
      sizeClasses = 'py-1 px-3 text-sm';
      break;
    case 'medium':
      sizeClasses = 'py-2 px-4 text-base';
      break;
    case 'large':
      sizeClasses = 'py-3 px-6 text-lg';
      break;
  }

  return (
    <div 
    className='w-80 text-white rounded-full hover:scale-105 transition duration-300 '
      >
      <button 
      className={`block h-15 glow ${sizeClasses} w-30`}
      onClick={onClick}>
      {text}
    </button>
    </div>

  );
}

export default Button;
