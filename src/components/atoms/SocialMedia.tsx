import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function SocialMedia() {
  return (
  <div className="w-full"> 
    <div className="social-media">
      <h3 className="font-bold mb-2">Sur les réseaux</h3>
      <div className="flex space-x-4">
        <a href="https://www.facebook.com" className="btn btn-primary">
          <FontAwesomeIcon icon={"facebook-messenger"} />
              </a>
        <a href="https://www.twitter.com" className="btn btn-primary">
          <FontAwesomeIcon icon={"twitter"} />
        </a>
        <a href="https://www.instagram.com" className="btn btn-primary">
          <FontAwesomeIcon icon={"instagram"} />
        </a>
        <a href="https://www.linkedin.com" className="btn btn-primary">
          <FontAwesomeIcon icon={"linkedin"} />
        </a>
      </div>
    </div>
    </div>
  );
}

export default SocialMedia;