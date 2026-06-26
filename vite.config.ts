import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: '/templates/dashboard.html',
  },
  build: {
    rollupOptions: {
      input: {
        root: 'index.html',
        dashboard: 'templates/dashboard.html',
        login: 'templates/login.html',
        receita: 'templates/receita.html',
        perfil: 'templates/perfil.html',
        form_receita: 'templates/form_receita.html',
      },
    },
  },
});
