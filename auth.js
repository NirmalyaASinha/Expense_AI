import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token, profile }) {
      if (profile?.id) {
        token.sub = String(profile.id);
      }
      return token;
    },
  },
  session: { strategy: "jwt" },
});

export const { GET, POST } = handlers;
