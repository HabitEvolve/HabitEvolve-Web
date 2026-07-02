import React from "react";
import { Link } from "react-router";
import LanguageToggle from "../../components/common/LanguageToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative bg-white z-1 min-h-screen dark:bg-slate-950">
      {/* Language toggle — top right corner */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>
      <main className="flex min-h-screen flex-col md:flex-row overflow-hidden">
        {children}
      </main>
    </div>
  );
}
