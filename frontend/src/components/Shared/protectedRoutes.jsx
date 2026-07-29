import { useContext } from 'react';
import { Navigate } from 'react-router';
import { UserContext } from '@/Context/UserContext';

const ProtectedRoute = ({ children }) => {
  const { userToken, userData, loading } = useContext(UserContext);

  if (loading) {
    return (
      <div className="flex-center w-full h-screen">
        <div className="flex-center flex-col">
          <img 
            src="/assets/images/loader.svg" 
            alt="Loading..." 
            width={24} 
            height={24}
            className="animate-spin"
          />
          <p className="text-light-2 mt-2">Loading...</p>
        </div>
      </div>
    ); 
  }

  if (!userToken || !userData) {
    return <Navigate to="/sign-in" />;
  }

  return children;
};

export default ProtectedRoute;
