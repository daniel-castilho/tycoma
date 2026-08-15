export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarMediaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRepository = {
  count(): Promise<number>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User>;
  update(
    id: string,
    data: Partial<Pick<User, "name" | "email" | "passwordHash" | "avatarMediaId">>,
  ): Promise<User>;
};
