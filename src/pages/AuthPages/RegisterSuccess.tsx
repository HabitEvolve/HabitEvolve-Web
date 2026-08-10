import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import RegisterSuccessPanel from "../../components/auth/RegisterSuccess";
import { useAuth } from "../../context/AuthContext";
import { getRoleBasedRedirect } from "../../utils/roleRedirect";

export default function RegisterSuccess() {
  const { isAuthenticated, user } = useAuth();

  // Same guard as SignUp/SignIn: an already-signed-in visitor has no business
  // on a "now go and sign in" screen.
  if (isAuthenticated && user) {
    return <Navigate to={getRoleBasedRedirect(user.roles)} replace />;
  }

  return (
    <>
      <PageMeta
        title="Habit - Registration Successful"
        description="Your Habit account has been created. Sign in to start your journey."
      />
      <AuthLayout>
        <RegisterSuccessPanel />
      </AuthLayout>
    </>
  );
}
