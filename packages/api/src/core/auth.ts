export interface ApiUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface ApiSession {
  user: ApiUser;
}

export interface AuthReader {
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
}
