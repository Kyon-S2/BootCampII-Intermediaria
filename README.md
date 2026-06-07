# ⬡ Finance Control System

<div align="center">

![Finance Control System](https://img.shields.io/badge/Finance%20Control-System-00f5ff?style=for-the-badge&labelColor=0d0d0d)
![Status](https://img.shields.io/badge/status-online-00ff88?style=for-the-badge&labelColor=0d0d0d)
![Jest](https://img.shields.io/badge/testes-42%20passed-ffd700?style=for-the-badge&labelColor=0d0d0d)

**Sistema de controle de gastos pessoais com autenticação, dados na nuvem e balanço financeiro.**

[🌐 Acessar o Sistema](https://kyon-s2.github.io/BootCampII-Intermediaria/)

</div>

---

## 👥 Membros do Grupo

| Nome | GitHub |
|------|--------|
| Felipe Gabriel do Nascimento Rodrigues | — |
| Lucas Palácio Mello | — |
| Letícia Vitória Cardoso Cunha | — |
| Guilherme Brito Andrade | — |
| Daniel Carlos Delfino dos Santos | — |

---

## 📌 Sobre o Projeto

O **Finance Control System** é uma conversão do projeto inicial que era CLI em Python, convertido para GUI em HTML, CSS e JavaScript com uso do Claude Code. O sistema permite controlar gastos e ganhos pessoais com autenticação de usuários, persistência de dados na nuvem e isolamento por conta.

## ✨ Funcionalidades

- 🔐 **Autenticação** — cadastro e login com e-mail e senha via Supabase Auth
- ➕ **Cadastro de Gastos** — nome, valor, categoria (select) e data
- ✏️ **Edição de Gastos** — atualização de qualquer campo com categoria em select
- ✕ **Remoção de Gastos** — com modal de confirmação antes de excluir
- ➕ **Cadastro de Ganhos** — nome, valor, categoria, data e flag de ganho fixo mensal
- ✕ **Remoção de Ganhos** — com modal de confirmação antes de excluir
- 📊 **Relatório** — tabela completa com filtro por categoria e total acumulado
- 📈 **Dashboard** — total acumulado, quantidade de gastos e maior gasto
- ⚖️ **Balanço Financeiro** — diferença entre ganhos e gastos em tempo real
- 🎯 **Limite Mensal** — definição de teto de gastos com alerta visual ao atingir 80% e 100%
- 💾 **Dados na nuvem** — persistência real via Supabase (PostgreSQL)
- 🔒 **Isolamento por usuário** — Row Level Security (RLS) no banco

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Testes | Jest |
| CI/CD | GitHub Actions |
| Deploy | GitHub Pages |

---

## 🚀 Como Rodar Localmente

**Pré-requisitos:** Node.js instalado, VS Code com extensão Live Server e uma conta no [Supabase](https://supabase.com)

```bash
# 1. Clone o repositório
git clone https://github.com/kyon-s2/BootCampII-Intermediaria.git
cd BootCampII-Intermediaria

# 2. Instale as dependências
npm install

# 3. Configure as credenciais do Supabase
# As credenciais (SUPABASE_URL e SUPABASE_ANON) estão no topo do app.js.
# Caso prefira, crie um arquivo config.js baseado no config.example.js
# e importe as variáveis no app.js.
# ⚠️ Nunca envie credenciais reais para o repositório.

# 4. Abra o index.html com a extensão Live Server no VS Code
```

---

## ⚙️ Configuração do Supabase

### 1. Crie a tabela `gastos` no SQL Editor

```sql
CREATE TABLE gastos (
  id        BIGSERIAL PRIMARY KEY,
  nome      TEXT      NOT NULL,
  valor     NUMERIC   NOT NULL,
  classe    TEXT      NOT NULL,
  data      TEXT      NOT NULL,
  user_id   UUID      REFERENCES auth.users(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### 2. Crie a tabela `ganhos` no SQL Editor

```sql
CREATE TABLE ganhos (
  id        BIGSERIAL PRIMARY KEY,
  nome      TEXT      NOT NULL,
  valor     NUMERIC   NOT NULL,
  classe    TEXT      NOT NULL,
  data      TEXT      NOT NULL,
  fixo      BOOLEAN   DEFAULT FALSE,
  user_id   UUID      REFERENCES auth.users(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### 3. Configure as policies (RLS) para `gastos`

```sql
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio" ON gastos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_proprio" ON gastos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_proprio" ON gastos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_proprio" ON gastos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### 4. Configure as policies (RLS) para `ganhos`

```sql
ALTER TABLE ganhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_ganho_proprio" ON ganhos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_ganho_proprio" ON ganhos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_ganho_proprio" ON ganhos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### 5. Trigger para preencher `user_id` automaticamente

```sql
CREATE OR REPLACE FUNCTION preencher_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_user_id_gastos
  BEFORE INSERT ON gastos
  FOR EACH ROW EXECUTE FUNCTION preencher_user_id();

CREATE TRIGGER trigger_user_id_ganhos
  BEFORE INSERT ON ganhos
  FOR EACH ROW EXECUTE FUNCTION preencher_user_id();
```

---

## 🧪 Testes

O projeto possui **42 testes automatizados** cobrindo:

- Validação de valor, nome, classe e data
- Validação de e-mail, senha e confirmação de senha
- Cálculo de total e maior gasto
- Remoção de gastos por ID
- Formatação de valores em real brasileiro

```bash
npm test
```

A pipeline de CI roda automaticamente a cada push via **GitHub Actions**.

---

## 📁 Estrutura do Projeto

```
BootCampII-Intermediaria/
├── .github/
│   └── workflows/
│       └── ci.yml            # Pipeline de testes automáticos
├── node_modules/             # Dependências (ignorado pelo git)
├── .gitignore
├── app.js                    # Lógica principal e integração Supabase
├── app.tests.js              # Testes automatizados (Jest)
├── config.example.js         # Modelo de configuração (sem credenciais)
├── favicon.ico               # Ícone do site
├── filters.css               # Estilos do painel de filtros
├── filters.js                # Lógica de filtro por categoria no relatório
├── index.html                # Estrutura da aplicação
├── package.json
├── package-lock.json
├── README.md
└── style.css                 # Estilização principal (tema cyberpunk)
```

---

## 🔄 Origem do Projeto

Este projeto foi originalmente desenvolvido em **Python (CLI)** durante o BootCamp II e convertido para uma aplicação web completa como entrega intermediária, mantendo a mesma lógica de validação e expandindo com:

- Interface gráfica web com tema cyberpunk
- Autenticação de usuários
- Banco de dados na nuvem com duas tabelas (gastos e ganhos)
- Edição de registros com RLS no Supabase
- Balanço financeiro e limite mensal com alertas visuais
- Filtro de relatório por categoria
- Testes automatizados e pipeline de CI/CD

---

<div align="center">

Desenvolvido durante o **BootCamp II — 2026**
Uso de Inteligência Artificial (Clade Code, Gemini, etc)

</div>
