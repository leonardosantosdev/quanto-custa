Quero que você crie um MVP funcional chamado **Ação Clara**.

O produto será inicialmente uma ferramenta simples para calcular e explicar o Número de Graham de ações brasileiras negociadas na B3.

Trabalhe diretamente neste repositório e implemente o projeto completo. Antes de alterar arquivos, examine o conteúdo atual da pasta. Caso ela esteja vazia, inicialize o projeto.

## Objetivo do produto

O usuário deve conseguir:

1. Entrar na página inicial.
2. Pesquisar uma empresa pelo ticker ou pelo nome.
3. Selecionar uma ação brasileira.
4. Visualizar:
   - nome da empresa;
   - ticker;
   - cotação atual;
   - LPA;
   - VPA;
   - Número de Graham;
   - diferença percentual entre a cotação e o Número de Graham;
   - data e horário dos dados;
   - fórmula utilizada;
   - explicação simples do resultado;
   - limitações da métrica.

5. Acessar uma URL individual, como `/acao/BBAS3`.

O MVP deve ser pequeno, funcional e fácil de executar localmente. Não transforme o projeto em uma plataforma financeira completa.

## Stack obrigatória

Use:

- Next.js na versão estável atual;
- TypeScript;
- App Router;
- Tailwind CSS;
- ESLint;
- Route Handlers ou funções server-side do Next.js para acessar a API externa;
- npm como gerenciador de pacotes.

Não use:

- NestJS;
- banco de dados;
- autenticação;
- ORM;
- Redux;
- Docker como requisito para rodar;
- arquitetura de microserviços;
- biblioteca de componentes pesada;
- sistema de pagamento;
- inteligência artificial;
- painel administrativo.

O projeto deve rodar apenas com:

```bash
npm install
npm run dev
```

## Identidade visual

O nome provisório do produto é **Ação Clara**.

Não crie logo, mascote ou ilustrações complexas.

Use apenas o texto “Ação Clara” como identidade no cabeçalho.

Centralize o nome do produto em uma constante ou arquivo de configuração, para que ele possa ser facilmente alterado no futuro.

A aparência deve ser:

- limpa;
- moderna;
- confiável;
- simples;
- responsiva;
- agradável no celular e no desktop.

Evite aparência de corretora, excesso de elementos, gradientes exagerados e promessas de investimento.

Utilize uma paleta neutra, boa hierarquia tipográfica e cards discretos.

## Fonte de dados

Use a API da brapi.dev como primeira opção para:

- pesquisar e validar tickers;
- obter nome da empresa;
- obter tipo do ativo;
- obter cotação;
- obter LPA/EPS;
- obter VPA diretamente ou dados que permitam calculá-lo;
- obter data ou horário da cotação.

Consulte a documentação atual da brapi.dev antes de implementar os endpoints e confirme os nomes reais dos campos retornados. Não invente propriedades da resposta.

O token deve ser lido apenas no servidor por meio de:

```env
BRAPI_TOKEN=
```

Crie um arquivo `.env.example`, mas não coloque um token real nele.

Nunca envie o token ao navegador.

Crie uma camada isolada em `lib/brapi` ou estrutura equivalente para que a fonte dos dados possa ser substituída futuramente.

## Ausência de token ou falha da API

Quero conseguir visualizar o MVP mesmo antes de cadastrar um token.

Portanto, implemente um modo de demonstração com alguns dados locais claramente identificados como simulados.

Inclua pelo menos:

- BBAS3 — Banco do Brasil;
- PETR4 — Petrobras;
- ITSA4 — Itaúsa;
- WEGE3 — WEG.

Quando não existir `BRAPI_TOKEN`, o sistema deve usar esses dados locais e mostrar discretamente:

“Dados de demonstração.”

Quando houver token, deve tentar utilizar a API real.

Caso a API falhe, não quebre a página. Exiba uma mensagem amigável e, somente durante desenvolvimento, permita usar os dados simulados como fallback.

Não apresente dados simulados como se fossem dados atuais reais.

## Universo inicial

Suporte apenas ações brasileiras da B3.

Não tente suportar neste MVP:

- ações americanas;
- criptomoedas;
- FIIs;
- ETFs;
- BDRs;
- moedas;
- índices.

Caso o ticker seja de uma categoria incompatível, informe que o Número de Graham foi pensado para ações de empresas e que esse ativo ainda não é suportado.

## Fórmula

Utilize:

```text
Número de Graham = raiz quadrada de (22,5 × LPA × VPA)
```

Crie uma função pura e testável, semelhante a:

```ts
calculateGrahamNumber({
  eps,
  bookValuePerShare,
});
```

Ela deve retornar um resultado tipado, sem lançar erro para casos financeiros esperados.

Validações:

- LPA ausente;
- VPA ausente;
- LPA igual a zero;
- VPA igual a zero;
- LPA negativo;
- VPA negativo;
- valores que não sejam números válidos.

Quando LPA ou VPA forem menores ou iguais a zero, não calcule a raiz. Explique por que o método não é aplicável.

## Comparação percentual

Calcule a diferença entre a cotação atual e o Número de Graham.

Use uma função separada e testável.

Na interface, não escreva conclusões absolutas como:

- “A ação está barata”;
- “É uma oportunidade”;
- “Você deve comprar”.

Prefira textos objetivos como:

- “A cotação está 18,4% abaixo do Número de Graham.”
- “A cotação está 12,1% acima do Número de Graham.”

Inclua também:

“O Número de Graham é apenas uma métrica isolada e não representa recomendação de compra ou venda.”

## Página inicial

Crie uma página inicial contendo:

### Cabeçalho

- texto “Ação Clara”;
- link para a página inicial;
- link para “Metodologia”.

### Seção principal

Título:

“Consulte o Número de Graham de uma ação”

Subtítulo:

“Pesquise pelo ticker ou nome da empresa e compare a cotação com o valor calculado pela fórmula de Benjamin Graham.”

### Campo de busca

Placeholder:

“Digite BBAS3 ou Banco do Brasil”

Comportamentos:

- aceitar ticker ou nome;
- ignorar diferenças entre maiúsculas e minúsculas;
- apresentar sugestões enquanto o usuário digita;
- permitir navegação por teclado;
- mostrar ticker, nome e classe da ação quando disponível;
- utilizar debounce para evitar chamadas excessivas;
- não consultar a API para cada tecla sem controle;
- mostrar estado de carregamento;
- mostrar estado sem resultados;
- impedir seleção de ativos incompatíveis.

Ao selecionar um resultado, navegar para:

```text
/acao/[ticker]
```

Exemplo:

```text
/acao/BBAS3
```

### Conteúdo introdutório

Abaixo da busca, inclua um texto curto explicando:

- o que é o Número de Graham;
- que a ferramenta serve como referência educacional;
- que o resultado não substitui uma análise completa.

## Página da ação

Crie uma rota dinâmica:

```text
/acao/[ticker]
```

Ela deve conter:

### Identificação

- nome da empresa;
- ticker;
- classe do ativo, quando disponível;
- data e horário da última atualização.

### Resultado principal

Destaque visualmente:

- Número de Graham;
- cotação atual;
- diferença percentual.

Não destaque a diferença com linguagem sensacionalista.

### Dados utilizados

Mostre em cards:

- LPA;
- VPA;
- cotação;
- período ou data de referência, quando fornecido pela API.

### Explicação

Gere o texto de forma determinística, sem utilizar IA.

Exemplo de estrutura:

“O Número de Graham de BBAS3 é R$ X. A cotação considerada foi R$ Y. Com esses dados, a cotação está Z% abaixo/acima do resultado da fórmula.”

### Memória do cálculo

Mostre os valores substituídos na fórmula:

```text
√(22,5 × LPA × VPA)
```

Exemplo:

```text
√(22,5 × 7,20 × 32,50) = R$ 72,57
```

### Limitações

Inclua uma seção explicando que:

- a fórmula não deve ser usada isoladamente;
- dados contábeis podem se referir a períodos diferentes da cotação;
- empresas com prejuízo ou patrimônio negativo não geram resultado válido;
- a fórmula pode ser inadequada para certos setores ou estruturas empresariais;
- o resultado não é recomendação de investimento.

### Nova pesquisa

Inclua uma forma evidente de pesquisar outra ação.

## Página de metodologia

Crie:

```text
/metodologia
```

Explique de forma curta e clara:

- a fórmula;
- o significado de LPA;
- o significado de VPA;
- como a diferença percentual é calculada;
- por que alguns ativos não produzem resultado;
- origem dos dados;
- limitações;
- aviso educacional.

Não copie textos longos de outros sites.

## Componentes e organização

Organize o código com responsabilidades claras.

Uma estrutura aceitável seria:

```text
app/
  page.tsx
  metodologia/page.tsx
  acao/[ticker]/page.tsx
  api/search/route.ts
  api/stocks/[ticker]/route.ts

components/
  header.tsx
  stock-search.tsx
  graham-result.tsx
  metric-card.tsx
  formula-breakdown.tsx
  disclaimer.tsx

lib/
  config.ts
  graham.ts
  brapi.ts
  demo-data.ts
  formatters.ts
  types.ts
```

Você pode adaptar a estrutura caso exista uma organização mais apropriada, mas mantenha o projeto simples.

## Renderização e segurança

- Realize chamadas com token somente no servidor.
- Valide e normalize o ticker recebido.
- Não aceite URLs arbitrárias fornecidas pelo usuário.
- Não exponha detalhes internos de erros na interface.
- Faça encode apropriado dos parâmetros.
- Evite `any`.
- Não duplique tipos desnecessariamente.
- Use Server Components por padrão.
- Use Client Components apenas onde houver interação, como a busca.
- Não faça todo o site virar um único Client Component.

## Cache

Implemente cache simples usando recursos nativos do Next.js.

Sugestão:

- busca/lista de tickers: revalidação longa;
- fundamentos: algumas horas;
- cotação: alguns minutos.

Não adicione Redis, banco ou serviço externo de cache.

Documente no README onde os tempos podem ser alterados.

## Formatação brasileira

Utilize:

```ts
new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
```

Para percentuais e datas, utilize também localização `pt-BR`.

A interface deve estar integralmente em português brasileiro.

## SEO básico

Configure:

- título;
- descrição;
- metadata da página inicial;
- metadata dinâmica para cada ação;
- HTML semântico;
- headings organizados;
- URL legível;
- conteúdo renderizado no servidor quando possível.

Exemplo de título dinâmico:

“BBAS3: Número de Graham e cotação | Ação Clara”

Não implemente blog, sitemap complexo ou otimizações excessivas neste momento.

## Acessibilidade

Garanta:

- labels nos campos;
- navegação por teclado;
- foco visível;
- contraste adequado;
- mensagens de erro compreensíveis;
- atributos ARIA quando realmente necessários;
- suporte básico a leitores de tela.

## Testes

Configure testes unitários simples usando Vitest ou outra solução leve compatível.

Teste pelo menos:

- cálculo válido do Número de Graham;
- LPA negativo;
- VPA negativo;
- valor zero;
- valor ausente;
- comparação abaixo do Número de Graham;
- comparação acima do Número de Graham;
- formatação do texto final.

Não crie uma suíte de testes excessiva.

## README

Crie um README em português explicando:

1. objetivo do projeto;
2. tecnologias;
3. requisitos;
4. instalação;
5. execução local;
6. criação do `.env.local`;
7. funcionamento do modo de demonstração;
8. execução dos testes;
9. build de produção;
10. deploy sugerido na Vercel;
11. limitações atuais;
12. ideias fora do escopo do MVP.

Inclua os comandos exatos:

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Scripts

Garanta scripts funcionais para:

- `dev`;
- `build`;
- `start`;
- `lint`;
- `test`.

## Critérios de aceite

Considere o trabalho concluído somente quando:

- o projeto instalar sem erro;
- `npm run lint` passar;
- `npm run test` passar;
- `npm run build` passar;
- a página inicial abrir;
- a busca funcionar com dados simulados sem token;
- BBAS3 abrir em uma página própria;
- o cálculo for exibido;
- casos inválidos tiverem mensagens apropriadas;
- o layout funcionar em celular;
- não houver banco de dados;
- não houver dependência obrigatória de Docker;
- não houver token exposto no frontend;
- existir `.env.example`;
- existir README completo.

## Forma de execução do trabalho

Implemente o projeto, não apenas descreva o que deveria ser feito.

Siga esta sequência:

1. Inspecione o repositório.
2. Crie ou ajuste o projeto.
3. Implemente primeiro o modo de demonstração.
4. Implemente as funções de cálculo e seus testes.
5. Implemente a interface.
6. Implemente a integração isolada com a brapi.dev.
7. Execute lint, testes e build.
8. Corrija todos os erros encontrados.
9. Ao final, apresente:
   - resumo do que foi criado;
   - estrutura principal;
   - comandos para executar;
   - arquivos relevantes;
   - limitações restantes;
   - qualquer ponto da API que precise ser confirmado por mim.

Não pare apenas para me perguntar decisões estéticas pequenas. Tome decisões simples e coerentes com o escopo.

Não adicione funcionalidades fora do escopo para “melhorar” o produto.
