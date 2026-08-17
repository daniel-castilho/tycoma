import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    // `data/` holds gitignored runtime bind mounts (Mongo, LocalStack) owned by
    // the Docker containers; linting it fails on EACCES. Never lint runtime data.
    ignores: ["data/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The codebase uses `_`-prefixed names for the destructure-and-omit
      // pattern in Prisma adapters (e.g. `const { id: _id, ...rest } = data`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;