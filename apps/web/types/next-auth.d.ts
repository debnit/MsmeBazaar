import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string;
      email?: string;
      image?: string;
      role?: string; // 👈 This allows you to use session.user.role
    };
  }
}
