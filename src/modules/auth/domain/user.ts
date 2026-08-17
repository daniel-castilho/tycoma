export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarMediaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserReader = {
  count(): Promise<number>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
};

export type UserWriter = {
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

export type UserRepository = UserReader & UserWriter;
