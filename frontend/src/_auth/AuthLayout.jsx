import { Outlet, Navigate } from "react-router"
import { useContext } from 'react';
import { UserContext } from '@/Context/UserContext'

const AuthLayout = () => {
  const { userToken } = useContext(UserContext);
  const isAuthenticated = !!userToken;
  return (
    <>
      {isAuthenticated ? (
        <Navigate to="/" />
      ) : (
        <>
          <section className="flex flex-1 justify-center items-center flex-col py-10 bg-black h-screen ">
            <Outlet/>
          </section>

          <img
            src={"/assets/images/pics2.jpg"}
            alt="logo"
            className="hidden xl:block w-1/2 object-cover bg-no-repeat h-screen"
          />
        </>
      )}
    </>
  );
}

export default AuthLayout