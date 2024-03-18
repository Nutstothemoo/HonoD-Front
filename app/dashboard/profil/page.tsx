import { ProfilTabs } from '@/components/ProfilTabs'
import AvatarUploadPage from '@/components/UploadAvatar'
import React from 'react'

function Profil() {
  return (
    <section>
      <div className="flex flex-col items-center justify-between pt-24">
        <div className='flex flex-col gap-3'>Discover Our Latest Fueg Event</div>
            <AvatarUploadPage />
            <ProfilTabs />
      </div>
    </section>
  )
}

export default Profil