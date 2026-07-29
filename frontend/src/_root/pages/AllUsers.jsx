import { useContext, useEffect, useState } from "react";
import api from "@/api/axios";
import Loader from '@/components/Shared/Loader';
import UserCard from "@/components/Shared/UserCard";
import { toast } from "react-hot-toast";
import { UserContext } from "@/Context/UserContext";

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userToken } = useContext(UserContext);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get(
          "/api/v1/auth/user/list",
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        setUsers(response.data.users);
      } catch (err) {
        setError("Failed to load users.");
        toast.error("Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [userToken]);

  if (isLoading) return <Loader />;
  if (error) return <p>{error}</p>;

  return (
    <div className="common-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src='/assets/images/people.svg'
          width={36}
          height={36}
          alt="Saved Icon"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">All Users</h2>
      </div>

      <ul className="user-grid">
        {users.map((user) => (
          <li key={user._id} className="flex-1 min-w-[200px] w-full">
            <UserCard user={user} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AllUsers;
