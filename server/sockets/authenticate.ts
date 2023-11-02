import { supabaseConfig } from "services/supabase";
import { ResponseUser, User } from "types/User";

export const authenticate = (token: string) => {
  return new Promise<User>(async (res, rej) => {
    try {
      const response = await fetch(`${supabaseConfig.projectUrl}/auth/v1/user`, {
        headers: {
          apiKey: supabaseConfig.anonKey,
          authorization: `Bearer ${token}`,
        },
      });

      const user: ResponseUser | User = await response.json();

      // if (!user?.is_active) {
      //   rej({ code: 4001, error: "user is not active" });
      //   return;
      // }
      user.id = user.id.toString();
      res(user as User);
    } catch (error) {
      rej({ code: 4001, error: "authentication failed,token is invalid" });
      return;
    }
  });
};
