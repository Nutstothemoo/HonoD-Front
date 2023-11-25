import React from 'react';

function Footer() {
  return (
    <footer className="p-6 shadow-md w-full">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="font-bold mb-2">Villes</h3>
          </div>
        <div>
          <h3 className="font-bold mb-2">Organisateurs</h3>
          </div>
        <div>
          <h3 className="font-bold mb-2">Festivals
          </h3>
          </div>
        <div>
          <h3 className="font-bold mb-2">Support</h3>
          {/* Ajoutez ici les liens pour le support */}
        </div>
      </div>
    </footer>
  );
}

export default Footer;