import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: '/templates/index.html',
  },
  build: {
    rollupOptions: {
      input: {
        root: 'index.html',
        index: 'templates/index.html',
        login: 'templates/login.html',
        receita: 'templates/receita.html',
        perfil: 'templates/perfil.html',
        form_receita: 'templates/form_receita.html',
      },
    },
  },
});
