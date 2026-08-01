# Ação Clara

MVP educacional para pesquisar ações brasileiras e calcular o Número de Graham a partir de LPA (lucro por ação) e VPA (valor patrimonial por ação). A interface mostra a cotação considerada, a diferença percentual, a memória do cálculo e as limitações da métrica.

## Tecnologias

- Next.js 16 com App Router e Server Components
- React 19 e TypeScript
- Tailwind CSS 4
- ESLint
- Vitest
- brapi.dev, acessada exclusivamente no servidor

## Requisitos

- Node.js 20.19 ou superior (recomendado: versão LTS atual)
- npm
- Token da brapi.dev opcional

## Instalação e execução local

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Next.js no terminal. Sem configuração adicional, o projeto inicia em modo de demonstração.

## Configuração da brapi.dev

Copie `.env.example` para `.env.local` e adicione o token:

```env
BRAPI_TOKEN=seu_token_aqui
```

O token é lido apenas em `lib/brapi.ts`, código exclusivo do servidor. Ele não usa o prefixo `NEXT_PUBLIC_` e não é enviado ao navegador.

## Modo de demonstração

Quando `BRAPI_TOKEN` não existe, a aplicação usa dados locais simulados de BBAS3, PETR4, ITSA4 e WEGE3. A interface identifica esses valores com “Dados de demonstração.”

Se a API falhar com um token configurado, a página apresenta uma mensagem amigável. Apenas em desenvolvimento, ações presentes na amostra local podem ser exibidas como fallback, também identificadas como simuladas.

## Qualidade e build

```bash
npm run test
npm run lint
npm run build
```

Para executar o build de produção localmente:

```bash
npm run start
```

Todos os comandos principais:

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Organização principal

```text
app/
  acao/[ticker]/page.tsx      página dinâmica da ação
  api/search/route.ts         busca protegida no servidor
  api/stocks/[ticker]/route.ts consulta individual no servidor
  metodologia/page.tsx       explicação da metodologia
components/                  componentes de interface
lib/
  brapi.ts                   integração isolada e validação de respostas
  demo-data.ts               amostra local simulada
  graham.ts                  funções puras de cálculo
  formatters.ts              formatação pt-BR e texto determinístico
  config.ts                  nome do produto e tempos de cache
```

## Cache

Os tempos ficam centralizados em `lib/config.ts`:

- catálogo e busca de tickers: 24 horas;
- fundamentos: 4 horas;
- cotação: 5 minutos.

O cache usa a opção nativa `next.revalidate` do `fetch` no servidor. Ajuste os valores de `CACHE_TIMES` para mudar essa política.

## Deploy sugerido

A Vercel é o caminho mais direto para publicar o projeto:

1. importe o repositório na Vercel;
2. mantenha os comandos detectados para Next.js;
3. crie a variável de ambiente `BRAPI_TOKEN` para Production e Preview;
4. faça o deploy.

O modo de demonstração funciona sem variável, mas não deve ser apresentado como dado de mercado real.

## Limitações atuais

- Suporte intencional apenas a ações de empresas listadas na B3.
- FIIs, ETFs, BDRs, units, índices, cripto e ativos estrangeiros não são calculados.
- LPA ou VPA ausente, inválido, zero ou negativo impede o cálculo.
- O catálogo, a cotação e os fundamentos dependem da cobertura e do plano da brapi.dev.
- A fórmula não substitui análise de risco, qualidade, endividamento ou perspectivas.
- Não há banco de dados, autenticação, carteira ou histórico próprio.

## Fora do escopo do MVP

Comparação entre empresas, histórico de resultados, múltiplas métricas de valuation, carteira, alertas, autenticação e painel administrativo são ideias possíveis para outras fases, mas não fazem parte desta versão.

## Aviso

O Número de Graham é apenas uma métrica isolada. O conteúdo é educacional e não representa recomendação de compra ou venda.
