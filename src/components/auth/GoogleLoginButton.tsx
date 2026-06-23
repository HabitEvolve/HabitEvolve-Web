// Superseded by GoogleAuthButton — keeping this file so any existing imports don't break.
import GoogleAuthButton from './GoogleAuthButton';

interface GoogleLoginButtonProps {
    className?: string;
}

export default function GoogleLoginButton({ className }: GoogleLoginButtonProps) {
    return <GoogleAuthButton mode="login" className={className} />;
}
