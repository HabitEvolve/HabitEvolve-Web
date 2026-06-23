import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";
import { useAuth } from "../../context/AuthContext";
import { getRoleBasedRedirect } from "../../utils/roleRedirect";

export default function SignUp() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={getRoleBasedRedirect(user.roles)} replace />;
  }

  return (
    <>
      <PageMeta
        title="Habit - Sign Up"
        description="Create a new Habit account to start tracking your habits and achieving your goals."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
