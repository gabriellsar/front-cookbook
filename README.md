# 🍲 Panela — Frontend (Web)

Interface web do **Panela**, uma plataforma de receitas colaborativas com suporte a
*fork* (derivação de receitas entre usuários). Este repositório contém **apenas o
frontend**; a API está em `back-cookbook`.

> **Disciplina:** Programação para Web — PUC-Rio — 2026/1
> **Trabalho 2** — Aluno: **Gabriel Rosas**

---

## 📖 Descrição do projeto

O **Panela** é um "livro de receitas" da comunidade. A ideia central é o **fork**: assim
como no GitHub você bifurca um repositório, aqui você **bifurca uma receita** para criar a
sua própria versão — mantendo o vínculo com a original e formando uma **árvore de
derivações**.

Este frontend é uma **SPA multipágina** escrita em **TypeScript puro (sem framework)**,
empacotada com **Vite**, que consome a API REST do backend. Ele cobre todo o fluxo do
usuário: descobrir receitas, autenticar-se, publicar, editar, dar fork, avaliar e gerenciar
o próprio "livro" de receitas.

---

## 🛠️ Escopo do site (o que foi desenvolvido)

- **Descobrir receitas** — listagem da comunidade, **busca** por texto e **filtros** por
  categoria/tag (vegano, sem glúten, rápido, com forks etc.).
- **Receita em destaque** — bloco que exibe automaticamente a **receita mais bem avaliada**
  no momento, com **dados reais** (preparo, porções, média de avaliação e nº de forks). Se
  não houver receitas, mostra o estado vazio "Não temos nenhum destaque no momento".
- **Autenticação** — cadastro e login com **JWT**, com renovação automática de sessão
  (*refresh token*) e logout.
- **Publicar / editar receita** — formulário com nome, descrição, tempo de preparo,
  porções, ingredientes (linhas dinâmicas), passos numerados, tags e link de vídeo.
- **Detalhe da receita** — ingredientes, modo de preparo, **calculadora de porções**
  (recalcula quantidades), **avaliação por estrelas** sincronizada com o servidor, e a
  **árvore de forks** daquela receita.
- **Fork** — modal dedicado para derivar uma receita e ser redirecionado para editá-la.
- **Meu livro (perfil)** — área protegida com as receitas do usuário.
- **Segredos de família (lock)** — o autor pode **trancar** ingredientes/passos da sua
  receita original; quem faz **fork** herda o cadeado e não pode alterar esses itens.
- **Favoritos** — marcar receitas como favoritas (armazenamento local).

---

## 🧱 Stack e tecnologias

| Recurso | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Build / Dev server | Vite |
| Estilo | CSS modular (sem framework) |
| Ícones | Font Awesome 6.5.1 (empacotado localmente) |
| Comunicação | `fetch` + API REST do backend (JWT) |

---

## 📂 Estrutura do projeto

```
front-cookbook/
├── templates/             # Páginas HTML
│   ├── dashboard.html     # Descobrir + destaque + grade
│   ├── login.html         # Login / cadastro
│   ├── form_receita.html  # Publicar / editar receita
│   ├── receita.html       # Detalhe da receita
│   └── perfil.html        # Meu livro
├── src/
│   ├── types.ts           # Tipos alinhados ao contrato da API
│   ├── ts/
│   │   ├── pages/         # Lógica de cada página (app, auth, receita, ...)
│   │   ├── services/      # api, auth (JWT), recipeMeta, favorites, navAuth
│   │   ├── components/    # fork-modal, rating, serving-calculator
│   │   └── utils/         # format, toast
│   └── css/               # base/, components/, pages/
├── index.html             # Redireciona para o dashboard
├── vite.config.ts
└── package.json
```

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos
- Node.js 18+ e npm
- **O backend (`back-cookbook`) deve estar rodando** em `http://localhost:8000`
  (veja o README do backend).

### 2. Instalar dependências

```bash
cd front-cookbook
npm install
```

### 3. (Opcional) Configurar a URL da API

Por padrão o frontend usa `http://localhost:8000`. Para apontar para outro endereço, crie
um arquivo `.env`:

```bash
# front-cookbook/.env
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Subir em modo desenvolvimento

```bash
npm run dev
```

O Vite abre automaticamente `templates/dashboard.html` (geralmente em
`http://localhost:5173`).

### 5. Build de produção (opcional)

```bash
npm run build       # roda 'tsc' (type-check) + 'vite build' → dist/
npm run preview     # serve o build de produção
```

---

## 📘 Manual do usuário

### 1. Descobrir receitas (página inicial)
Ao abrir o site você cai no **Descobrir**. Use a **barra de busca** para procurar por nome
ou autor, e os **chips de filtro** para filtrar por categoria. O bloco **Receita em destaque**
mostra a receita mais bem avaliada do momento. Clique em qualquer card para ver o detalhe.

### 2. Criar conta / entrar
Clique em **Criar conta** ou **Entrar** (canto superior direito). No cadastro informe
usuário, e-mail e senha. Após autenticar, a barra de navegação passa a mostrar seu nome e o
botão **Sair**, e as ações protegidas (publicar, avaliar, fork) ficam liberadas.

### 3. Publicar uma receita
Em **Publicar**, preencha nome, descrição, **tempo de preparo (min)**, **porções**,
adicione **ingredientes** e **passos** (use os botões "+ ingrediente" / "+ etapa"),
selecione **tags** e, opcionalmente, um **link de vídeo**. Clique em **Publicar receita**.

### 4. Ver e usar uma receita
Na página de detalhe você encontra:
- **Calculadora de porções** — os botões `–`/`+` recalculam as quantidades dos ingredientes.
- **Avaliação** — clique nas **estrelas** (1 a 5) e em **Publicar avaliação**; a média é
  atualizada na hora e sua nota fica registrada.
- **Favoritar** — guarda a receita nos seus favoritos (local).
- **Dar fork** — abre um modal para criar a sua versão; você é levado direto para a edição.
- Se você é o **autor**, vê os botões **Editar** e **Excluir** no lugar do fork.

### 5. Forkar uma receita
Clique em **Dar fork**, descreva o que pretende adaptar e confirme. Uma cópia editável é
criada no seu perfil, já vinculada à original.

### 6. Meu livro (perfil)
Acesse **Meu livro** para ver e gerenciar suas receitas (requer login).

---

## ✅ O que foi testado e **funcionou**

- ✅ **Build de produção** (`npm run build`) e **type-check** (`tsc --noEmit`) sem erros.
- ✅ **Listagem** de receitas, **busca** e **filtros** por tag.
- ✅ **Receita em destaque**: seleção da mais bem avaliada (desempate por nº de avaliações
  e, por fim, pela mais recente) e **estado vazio** quando não há receitas.
- ✅ **Cadastro/login** com JWT e renovação automática de sessão em respostas `401`.
- ✅ **Publicar e editar** receitas, incluindo ingredientes e passos.
- ✅ **Avaliação por estrelas** integrada ao backend (envio da nota, recálculo da média e
  exibição da nota do próprio usuário) — fluxo validado ponta a ponta contra a API.
- ✅ **Fork** de receitas com redirecionamento para edição.
- ✅ **Calculadora de porções** recalculando quantidades numéricas.
- ✅ **Exclusão** de receitas pelo autor.
- ✅ **Segredos de família (lock):** o autor consegue trancar/destrancar ingredientes e
  passos da própria receita pelo formulário, e os itens trancados aparecem **somente
  leitura** ao editar um fork — comportamento **consistente com a regra do backend**
  (validado ponta a ponta: autor edita item trancado → OK; fork tenta editar segredo
  herdado → bloqueado).
- ✅ **Tags consistentes:** agora são salvas no **backend** (campo `tags` da receita), então
  aparecem iguais para todos os usuários e em qualquer dispositivo.

## ⚠️ O que **não funcionou / limitações conhecidas**

- ⚠️ **Alterar senha:** existe a tela, mas **não há endpoint** no backend. A UI apenas
  confere a senha atual (via login), explica a limitação e faz logout — **não troca a senha
  de fato**.
- ⚠️ **Esqueci minha senha:** não implementado (sem endpoint no backend).
- ⚠️ **Favoritos, ícone e cor de capa** ficam apenas no **`localStorage`** do navegador:
  **não são sincronizados** com o servidor nem compartilhados entre dispositivos ou usuários
  (são apenas cosméticos; não há campos para isso no backend).
- ℹ️ **Papel Guardião/Herdeiro:** todo usuário é criado como Herdeiro e não há tela para
  virar Guardião. Isso **não** afeta os segredos de família, que dependem de **autoria +
  fork** (não do papel) — qualquer autor tranca os itens da própria receita.
- ℹ️ **Upload de foto:** retirado do escopo (MVP). As receitas usam ícones; a zona de upload
  foi removida do formulário.

> Conforme a orientação do enunciado, as limitações acima estão **explicitamente
> relatadas** aqui.

---

## 👤 Autor

**Gabriel Rosas** — PUC-Rio, Programação para Web 2026/1.