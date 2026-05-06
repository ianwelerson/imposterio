<div align="center">
  <h1>🧾 Imposterio</h1>
  <p><strong>Transparência pública brasileira em tempo real</strong></p>
  <p>Quanto custa, o que faz e como age cada agente público do Brasil — tudo em um só lugar, com link direto para a fonte oficial.</p>

  <p>
    <a href="README.en.md">🇺🇸 Read in English</a>
    &nbsp;·&nbsp;
    <a href="https://imposterio.com.br">imposterio.com.br</a>
    &nbsp;·&nbsp;
    <a href="#-contribuindo">Contribuir</a>
    &nbsp;·&nbsp;
    <a href="#-licença">Licença</a>
  </p>

  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square" alt="Status: em desenvolvimento" />
  <img src="https://img.shields.io/badge/dados-tempo%20real-blue?style=flat-square" alt="Dados em tempo real" />
  <img src="https://img.shields.io/badge/acesso-gratuito-green?style=flat-square" alt="Acesso gratuito" />
  <img src="https://img.shields.io/badge/sem-cadastro-lightgrey?style=flat-square" alt="Sem cadastro" />
</div>

---

## O que é

O **Imposterio** é uma plataforma de transparência pública que agrega, em tempo real, dados de dezenas de APIs oficiais do governo brasileiro para responder a uma pergunta simples:

> *O que você, contribuinte, está financiando com o seu imposto?*

Cada número exibido vem diretamente de uma fonte governamental oficial — com um botão de link para a chamada exata da API que gerou aquele dado. Sem intermediários, sem interpretação: só o dado bruto, na sua cara.

---

## ✨ Funcionalidades

### 📊 Painel geral
Visão consolidada de todos os poderes com rankings por período configurável (7 dias, 30 dias, 6 meses, 1 ano):
- Parlamentar com maior e menor gasto (CEAP)
- Parlamentar com maior e menor presença
- Parlamentar com maior e menor número de assessores
- Custo total por poder, por partido, por estado

### 🏛️ Câmara dos Deputados
Por deputado: salário, despesas detalhadas por categoria, presença em cada sessão, votações (com orientação partidária), projetos de lei apresentados e aprovados, assessores e seus salários, emendas parlamentares destinadas, frentes parlamentares, discursos em plenário.

### 🏛️ Senado Federal
Por senador: os mesmos dados da Câmara, acrescidos de matérias relatadas, pareceres emitidos e histórico completo de mandatos anteriores.

### ⚖️ Judiciário
Por tribunal e por magistrado: remuneração (incluindo auxílios que superam o teto), produtividade (processos julgados por mês), tempo médio de tramitação, custo por processo julgado. Dados via CNJ/DataJud e portais de transparência de cada tribunal.

### 🏢 Poder Executivo
Por ministério e por agente público: remuneração detalhada de ministros, servidores efetivos e comissionados, gastos com viagens e diárias, contratos firmados, licitações realizadas, convênios com estados e municípios, emendas impositivas.

### 🕸️ Empresas e redes de interesse
Por CNPJ: total recebido do governo federal, total recebido via CEAP de parlamentares, doações para campanhas eleitorais, ROI político (quanto doou vs. quanto recebeu), rede de sócios com todas as empresas vinculadas a cada CPF, participação em licitações (vitórias e derrotas), alertas de CEIS/CNEP.

### 🎮 Acha Justo?
Um jogo de transparência: a plataforma exibe um gasto real de um agente público sem revelar de quem é. Você vota se acha justo ou não. Depois, a resposta revela o nome, foto, partido e todas as informações disponíveis sobre aquele agente. Os votos formam rankings de indignação popular por parlamentar, partido, tipo de gasto e estado — dados originais gerados pelo próprio Imposterio.

---

## 🔗 Fontes de dados

Todos os dados são consumidos em tempo real das fontes oficiais. Nenhum dado governamental é armazenado em banco próprio — apenas em cache temporário (Redis) para evitar sobrecarga nas APIs públicas.

| Fonte | Dados | Swagger / Docs |
|---|---|---|
| Câmara dos Deputados | Deputados, despesas, votações, presença, proposições | [dadosabertos.camara.leg.br](https://dadosabertos.camara.leg.br/swagger/api.html) |
| Senado Federal | Senadores, matérias, votações, discursos | [legis.senado.leg.br](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html) |
| Portal da Transparência | Executivo federal, servidores, contratos, CEIS/CNEP | [api.portaldatransparencia.gov.br](https://api.portaldatransparencia.gov.br/swagger-ui/index.html) |
| CNJ / DataJud | Magistrados, processos, produtividade judicial | [datajud-wiki.cnj.jus.br](https://datajud-wiki.cnj.jus.br/api-publica/) |
| TSE | Candidatos, patrimônio, doações de campanha | [dadosabertos.tse.jus.br](https://dadosabertos.tse.jus.br/) |
| Receita Federal (QSA) | Sócios e redes empresariais (base completa mensal) | [dados.gov.br](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj) |
| CNPJá | Consulta individual de CNPJ em tempo real | [open.cnpja.com](https://open.cnpja.com) |

---

## 🏗️ Arquitetura

O Imposterio é construído com o princípio de **mínimo armazenamento próprio**: os dados vêm das APIs oficiais, passam por um cache Redis com TTL configurado por tipo de dado, e chegam ao usuário com a URL exata da chamada que os gerou.

```
APIs Oficiais → Next.js (fetching + normalização) → Redis (cache TTL) → Frontend
                                                   ↓
                                              PostgreSQL
                                         (apenas votos do jogo)
```

**Stack:**
- **Frontend + API:** Next.js 14 com App Router e TypeScript
- **Cache:** Redis via Upstash (sem custo fixo, serverless)
- **Banco de dados:** PostgreSQL via Neon (exclusivamente para votos do jogo e base QSA da Receita Federal)
- **Deploy:** Vercel (web) + Railway (worker de importação mensal da base QSA)

**Monorepo com Turborepo:**
```
imposterio/
├── apps/
│   ├── web/          # Next.js — frontend + API Routes
│   └── worker/       # Importação mensal da base QSA da Receita Federal
├── packages/
│   ├── db/           # Schema Prisma + queries
│   ├── fetchers/     # Clientes para cada API pública (com _source injetado)
│   └── types/        # Tipos TypeScript compartilhados
├── CLAUDE.md         # Instruções para o Claude Code
└── README.md
```

**Princípio do `_source`:** cada dado retornado ao frontend carrega o campo `_source` com a URL exata da API que o gerou. O componente `<SourcePill>` renderiza esse link ao lado de cada informação, permitindo que qualquer usuário verifique o dado diretamente na fonte oficial.

---

## 🚀 Rodando localmente

### Pré-requisitos
- Node.js 20+
- pnpm 9+
- Conta gratuita no [Upstash](https://upstash.com) (Redis)
- Conta gratuita no [Neon](https://neon.tech) (PostgreSQL)
- API key gratuita do [Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/imposterio.git
cd imposterio

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
#    O arquivo de exemplo fica na raiz do repo. Copie para apps/web/.env.local
#    (caminho lido pelo Next.js) e preencha com suas chaves.
cp .env.example apps/web/.env.local

# 4. Gere o Prisma Client
#    Necessário antes do primeiro `pnpm dev`, e novamente sempre que
#    packages/db/schema.prisma mudar.
pnpm --filter @imposterio/db db:generate

# 5. Aplique o schema do banco (escolha um)
#    - Desenvolvimento (cria/atualiza migrações):
pnpm --filter @imposterio/db db:migrate
#    - Ou apenas sincroniza o schema sem criar migração:
# pnpm --filter @imposterio/db db:push

# 6. Inicie o servidor de desenvolvimento (web + worker via Turborepo)
pnpm dev
```

A aplicação web sobe em `http://localhost:3000` (ou na próxima porta livre, ex.: 3001).

### Variáveis de ambiente

Lista mínima para subir o app — veja [`.env.example`](./.env.example) para o conjunto completo, com comentários e links para cada provedor.

```env
# PostgreSQL (Neon) — votos do jogo + base QSA
DATABASE_URL=

# Redis (Upstash) — cache de todas as APIs públicas
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Portal da Transparência — chave gratuita (registro por e-mail)
TRANSPARENCIA_API_KEY=

# (Opcional) Chave pública DataJud/CNJ — disponível na wiki oficial
DATAJUD_API_KEY=
```

### Scripts úteis

```bash
pnpm dev                                  # web + worker em modo desenvolvimento
pnpm build                                # build de todos os apps
pnpm test                                 # executa testes (Vitest)
pnpm test:coverage                        # testes com cobertura
pnpm lint                                 # lint em todo o monorepo
pnpm --filter @imposterio/db db:studio    # abre Prisma Studio
```

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas. O Imposterio é um projeto de interesse público e toda ajuda conta.

**Áreas onde você pode contribuir:**
- 🐛 Reportar bugs ou dados incorretos
- 🔌 Adicionar suporte a novas fontes de dados (estados, municípios, tribunais específicos)
- 🎨 Melhorias de acessibilidade e UX
- 📖 Documentação e tutoriais
- 🌐 Traduções

**Como contribuir:**

```bash
# Fork e clone
git clone https://github.com/seu-usuario/imposterio.git

# Crie uma branch
git checkout -b feat/nome-da-feature

# Faça suas alterações e teste
pnpm test

# Abra um Pull Request
```

Por favor, leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um PR.

---

## 🗺️ Roadmap

- [x] Arquitetura base e documentação
- [ ] Câmara dos Deputados — painel por deputado
- [ ] Senado Federal — painel por senador
- [ ] Home com rankings consolidados
- [ ] Jogo "Acha Justo?"
- [ ] Board de rankings do jogo
- [ ] Painel de empresas e redes de sócios
- [ ] Poder Executivo — ministérios e servidores
- [ ] Judiciário — tribunais e magistrados
- [ ] Estados e municípios (expansão progressiva)

---

## 📄 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais informações.

Os dados exibidos são públicos e de responsabilidade dos órgãos governamentais que os produzem. O Imposterio é apenas um agregador e não se responsabiliza por eventuais inconsistências nas fontes oficiais.

---

<div align="center">
  <p>Feito com ☕ e indignação construtiva.</p>
  <p>Se esse projeto te ajudou a entender melhor o Brasil, considere compartilhar.</p>
</div>
