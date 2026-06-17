import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
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
