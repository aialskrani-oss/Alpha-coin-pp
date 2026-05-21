export interface Profile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
  apiKey: string;
}

export interface Balance {
  userId: string;
  amount: number;
}

export interface Transaction {
  id: string;
  fromUserId: string | null; // null if minted by system reward
  toUserId: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  reason: string;
  createdAt: string;
}
