// ESLint flat config for ESLint v9+
export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        },
        rules: {
            quotes: ["error", "double"],
            semi: ["error", "always"],
            curly: ["error", "all"],
            "no-case-declarations": "error",
        }
    }
];
