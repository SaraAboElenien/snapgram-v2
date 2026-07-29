import api from '@/api/axios'
import { createContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export const UserContext = createContext(null);



const UserContextProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(
    localStorage.getItem('userToken') || null
  )
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(!!userToken)
  const [error, setError] = useState(null)
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (userToken) {
        setLoading(true)
        try {
          // Validate JWT format and parse payload
          const tokenParts = userToken.split('.')
          if (tokenParts.length !== 3) {
            throw new Error('Invalid token format')
          }
          
          const { id } = JSON.parse(atob(tokenParts[1]))
          if (!id) {
            throw new Error('Invalid token payload')
          }
          
          const response = await api.get(
            `/api/v1/auth/user/userByID/${id}`,
            {
              headers: { Authorization: `Bearer ${userToken}` }
            }
          )
          setUserData(response.data)
          setError(null)
        } catch (err) {
          setError('Failed to fetch user data')
          localStorage.removeItem('userToken')
          setUserToken(null)
          setUserData(null)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
        setUserData(null)
        setError(null)
      }
    }

    fetchUserData()
  }, [userToken])

  useEffect(() => {
    if (userToken) {
      const activeSocket = connectSocket(userToken)
      setSocket(activeSocket)
    } else {
      disconnectSocket()
      setSocket(null)
    }
    return () => {
      disconnectSocket()
      setSocket(null)
    }
  }, [userToken])

  // A real, server-side logout — not just clearing the local token. Bumps
  // the account's sessionVersion, which auth.js checks on every request, so
  // this exact token (and any other still-open tab's copy of it) stops
  // working immediately instead of remaining valid for its full 7-day life.
  // Still clears local state even if the request fails — a network hiccup
  // shouldn't trap the user into staying "logged in" client-side.
  const logout = async () => {
    if (userToken) {
      try {
        await api.post(
          '/api/v1/auth/user/logout',
          {},
          { headers: { Authorization: `Bearer ${userToken}` } }
        )
      } catch {
        // ignore — still clear local state below regardless
      }
    }
    localStorage.removeItem('userToken')
    setUserToken(null)
    setUserData(null)
  }

  return (
    <UserContext.Provider
      value={{ userToken, setUserToken, userData, setUserData, loading, error, socket, logout }}
    >
      {children}
    </UserContext.Provider>
  )
}

export default UserContextProvider
