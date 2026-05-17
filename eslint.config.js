import { configPkg } from '@adonisjs/eslint-config'

export default configPkg({
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
