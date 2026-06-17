import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
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
