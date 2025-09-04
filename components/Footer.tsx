import React from 'react'
import Image from 'next/image'
import { logoutAccount } from '@/lib/actions/user.actions';
import { useRouter } from 'next/navigation';

const Footer = ({ user, type = "desktop" }: FooterProps) => {

  const router = useRouter();

  const handelLogOut =  async () => {
   const loggedOut = await logoutAccount();

   if(loggedOut) router.push('/sign-in');
  }

  if (!user) {
    return (
      <footer className="footer">
        <p className="text-gray-500">No user logged in</p>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">
          {user?.name?.[0] ?? "?"}
        </p>
      </div>

      <div className={type === "mobile" ? "footer_email-mobile" : "footer_email"}>
        <h1 className="text-40 truncate  text-gray-700 font-semibold">
          {user?.name}
        </h1>
        <p className='text-14 truncate font-normal text-gray-600'>
         {user?.email}
        </p>
      </div>
      
      <div className='footer_image' onClick={handelLogOut}>
        <Image src='/logout.svg' fill alt='jsm'/>
      </div>
    </footer>
  );
};


export default Footer
