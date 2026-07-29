import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router";
import { useContext , useState } from "react";
 import {UserContext} from "@/Context/UserContext";
import * as Yup from "yup";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { toast } from 'react-hot-toast';  
import Loader from "@/components/Shared/Loader";


// Yup Validation Schema
const SigninValidationSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

const SigninForm = () => {
  const { setUserToken, setUserData } = useContext(UserContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: yupResolver(SigninValidationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });



  // Handler
  const handleSignin = async (user) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post(
        `/api/v1/auth/user/signin`,
        user
      );
      const { data } = response;
  
      if (data?.message === "Signin successful") {
        setIsLoading(false);
        localStorage.setItem("userToken", data.token);
        setUserToken(data.token);
        setUserData(data.user);
        toast.success("Login successful! Welcome back.");
        navigate("/");  
      }
    } catch (err) {
      setIsLoading(false);
      setError(err?.response?.data?.message || "Something went wrong");
      toast.error(err?.response?.data?.message || "Login failed. Please try again.");
    }
  }; 
  
  
  
  
  return (
    <div className="sm:w-420 flex-center flex-col">
      <img src={"/assets/images/logo.svg"} alt="logo" />
      <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12 text-light-2">Log in to your account</h2>
      <p className="text-light-3 small-medium md:base-regular mt-2">
        Welcome back! Please enter your details.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSignin)}
          className="flex flex-col gap-5 w-full mt-4"
        >
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Email</FormLabel>
                <FormControl>
                  <Input type="email" className="shad-input" placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Password</FormLabel>
                <FormControl>
                  <Input type="password" className="shad-input" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error Message */}
          {error && <p className="text-red text-center">{error}</p>}

          {/* Submit Button */}
          <Button type="submit" className="shad-button_primary" disabled={isLoading}>
            {isLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Loading...
              </div>
            ) : (
              "Log In"
            )}
          </Button>

          {/* Signup Redirect */}
          <p className="text-small-regular text-light-2 text-center mt-2">
            Don&apos;t have an account?
            <Link to="/sign-up" className="text-primary-400 text-small-semibold ml-1 underline">
              Sign up
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
};

export default SigninForm;
