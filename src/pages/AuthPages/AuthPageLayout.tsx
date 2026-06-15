import React from "react";
import { Link } from "react-router";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative bg-white z-1 min-h-screen">
      <main className="flex min-h-screen flex-col md:flex-row overflow-hidden">
        {children}
      </main>
    </div>
  );
}
