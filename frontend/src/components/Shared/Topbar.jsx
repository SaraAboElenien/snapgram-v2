import { UserContext } from '@/Context/UserContext' 
import { useContext } from 'react';
import { Link, useNavigate } from 'react-router'
import { Button } from "@/components/ui/button";
import Loader from "@/components/Shared/Loader";
import { getOptimizedImageUrl } from "@/lib/utils";

const Topbar = () => {
  const { userData, loading, logout } = useContext(UserContext)
  const navigate = useNavigate()

  async function logOut() {
    await logout()
    navigate('/sign-in')
  }

  const isUserDataComplete = () => {
    return userData && userData._id;
  };

  const getProfileImage = () => {
    if (userData?.profileImage?.secure_url) {
      return getOptimizedImageUrl(userData.profileImage.secure_url, 'avatar');
    }
    return "/assets/images/profile-placeholder.svg";
  };

  return (
    <section className="topbar">
      <div className="flex-between py-4 px-5">
        <Link to="/" className="flex gap-3 items-center">
          <img
            src="/assets/images/logo.svg"
            alt="logo"
            width={130}
            height={325}
          />
        </Link>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="shad-button_ghost"
            onClick={logOut}
          >
            <img src="/assets/images/logout.svg" alt="logout" />
          </Button>
          
          {loading ? (
            <div className="h-8 w-8 flex items-center justify-center">
              <Loader />
            </div>
          ) : isUserDataComplete() ? (
            <Link to={`/profile/${userData._id}`} className="flex-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden">
                <img
                  src={getProfileImage()}
                  alt="profile"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.src = "/assets/images/profile-placeholder.svg";
                  }}
                />
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default Topbar