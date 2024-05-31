// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(eslint.configs.recommended, prettier, {
  files: ["**/*.ts", "**/*.tsx"],
  extends: tseslint.configs.recommendedTypeChecked,
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
