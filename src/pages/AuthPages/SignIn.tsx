import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { useAuth } from "../../context/AuthContext";
import { getRoleBasedRedirect } from "../../utils/roleRedirect";

export default function SignIn() {
  const { isAuthenticated, user } = useAuth();

  // If the user is already authenticated (e.g. they have a valid session from a
  // previous visit, or they just logged in and AuthContext committed the new user),
  // redirect them straight to their role-appropriate dashboard.
  // This also acts as the post-login navigation trigger: after SignInForm calls
  // login(), setUser() commits, isAuthenticated becomes true here, and this
  // <Navigate> fires — guaranteeing the route change happens AFTER state is committed.
  if (isAuthenticated && user) {
    return <Navigate to={getRoleBasedRedirect(user.roles)} replace />;
  }

  return (
    <>
      <PageMeta
        title="Habit - Sign In"
        description="Sign in to your Habit account to track your habits and achieve your goals."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
