import React from 'react';
import { Link } from 'react-router-dom';

function JoinCommunity() {
  return (
    <div className="join-community">
      <h3 className="font-bold mb-2">Rejoindre la communauté</h3>
      <div className="flex space-x-4">
        <Link to="/apple" className="btn btn-primary">
          Apple
        </Link>
        <Link to="/google-play" className="btn btn-primary">
          Google Play
        </Link>
      </div>
    </div>
  );
}

export default JoinCommunity;