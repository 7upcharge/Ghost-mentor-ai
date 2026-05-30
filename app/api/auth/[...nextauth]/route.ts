import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL)
console.log("NEXTAUTH_SECRET exists:", !!process.env.NEXTAUTH_SECRET)

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!
          )
          await supabase.from("user_profiles").upsert({
            user_id: user.id,
            last_active: new Date().toISOString(),
          }, { onConflict: "user_id", ignoreDuplicates: true })
        } catch (e) {
          console.error("Supabase upsert error:", e)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    }
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
