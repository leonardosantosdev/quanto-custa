# Quanto Custa

**Precifique o mercado financeiro.**

Aplicação educacional em Next.js que combina cotação atual com fundamentos oficiais da CVM e proventos oficiais da B3 para calcular e explicar o Número de Graham e o preço-teto de Bazin. Também inclui calculadora de juros compostos e comparador líquido de renda fixa.

## Arquitetura

```text
Vercel Cron ou CLI
  -> sincronização do cadastro oficial CVM/FCA + companhias e instrumentos B3
  -> HEAD nos ZIPs anuais ITR/DFP da CVM
  -> download somente de fontes alteradas
  -> descompactação e parsing em streaming
  -> filtro das companhias cadastradas
  -> seleção da reapresentação mais recente
  -> cálculo e validação de LPA/VPA
  -> transação Postgres (histórico + atual + estado + execução)
  -> atualização incremental dos dividendos e JCP por classe de ação na B3

Site
  -> catálogo da B3 e cotação da brapi.dev
  -> fundamentos atuais do Postgres
  -> cálculo automático com fundamentos CVM seguros
  -> fallback manual de LPA/VPA, sem persistência
  -> preço-teto de Bazin automático ou manual, com JCP líquido de IR
```

O projeto usa SQL direto com o cliente leve `postgres`, adequado a conexões serverless e sem acoplamento a APIs proprietárias. O provedor recomendado é Neon Postgres pela conexão padrão via `DATABASE_URL`; Supabase ou qualquer Postgres compatível também funciona.

## Fontes dos dados

- Fundamentos: conjuntos públicos oficiais [ITR](https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr) e [DFP](https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp) da CVM.
- Cotação: brapi.dev, consultada exclusivamente no servidor.
- Dividendos e JCP: histórico de eventos corporativos da B3, associado à classe da ação pelo ISIN.
- CDI anual: série 4389 do Banco Central, atualizada a cada hora e sempre editável como premissa da projeção.
- Cadastro ticker/CNPJ/código CVM: [FCA](https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca) e [cadastro diário de companhias abertas](https://dados.cvm.gov.br/dataset/cia_aberta-cad) da CVM, cruzados com os instrumentos e o [cadastro de companhias listadas](https://sistemaswebb3-listados.b3.com.br/listedCompaniesPage/) da B3.
- Catálogo complementar de busca: brapi.dev, usado somente como fallback para ativos ainda não sincronizados.
- Demonstração: `data/demo/stocks.ts`, apenas quando explicitamente habilitada.

A cotação pode mudar em minutos. LPA e VPA mudam após uma nova entrega ou reapresentação na CVM. A tela mostra separadamente o horário da cotação, a data de referência do demonstrativo, a data de recebimento do documento e a atualização do fundamento.

## Cálculo automático e manual

A entrada do cálculo oferece duas opções independentes:

- **Pesquisar uma ação:** a aplicação consulta cotação, usa LPA/VPA produzidos pela pipeline conservadora da CVM e mostra a comparação.
- **Preencher LPA e VPA:** uma calculadora separada usa somente os valores digitados para obter o Número de Graham. Ela não possui ticker, cotação ou comparação com o mercado.

Valores manuais nunca são enviados para a API, gravados no Postgres ou misturados ao histórico oficial. Uma ação sem fundamentos seguros pode direcionar o usuário à calculadora manual, mas os dois fluxos permanecem separados.

O método Bazin possui os mesmos dois fluxos independentes. No automático, a aplicação soma os dividendos integrais e o JCP líquido de 15% de IR cuja data-com está nos últimos 12 meses, ajustando eventos anteriores por desdobramentos, bonificações e grupamentos posteriores. O retorno mínimo padrão é 6%, mas pode ser alterado na calculadora manual. A cotação manual é opcional e serve apenas para comparação.

O comparador de renda fixa projeta uma aplicação única em dois produtos, com rentabilidade em percentual do CDI ou prefixada. Produtos tributáveis usam a tabela regressiva de IR sobre os rendimentos; LCI/LCA são tratadas como isentas para pessoa física. O prazo mínimo é 30 dias, pois o MVP não calcula IOF. CDI futuro, inflação, risco, liquidez e taxas externas não são previstos.

## Requisitos e configuração

- Node.js 20.19 ou superior;
- npm;
- banco Postgres acessível pela aplicação;
- token da brapi.dev para a experiência com dados reais.

Para desenvolvimento local, o `compose.yaml` fornece um Postgres 16 opcional com volume persistente. Docker não é necessário em produção.

```bash
npm install
npm run db:up
npm run db:setup
```

Copie `.env.example` para `.env.local`:

```env
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
CRON_SECRET=um-segredo-longo-e-aleatorio
BRAPI_TOKEN=seu-token-da-brapi
ENABLE_DEMO_DATA=false
```

Nenhuma dessas variáveis usa `NEXT_PUBLIC_`; segredos não são enviados ao navegador.

## Banco, migrations e seed

Com o Postgres local iniciado pelo Docker Compose, execute:

```bash
npm run db:up
npm run db:setup
```

`db:up` espera o healthcheck do Postgres; `db:setup` executa migrations, aplica as exceções manuais do seed e sincroniza o cadastro oficial completo. Para parar sem apagar o volume, use `npm run db:down`.

As migrations são registradas em `schema_migrations`. O seed lê `data/companies.ts`, faz upsert por ticker e pode ser executado repetidamente sem duplicar linhas.

Modelo principal:

- `companies`: cadastro de ticker, código CVM, CNPJ, classe, origem da associação, elegibilidade automática e estado ativo;
- `fundamentals`: um fundamento atual por ticker;
- `fundamentals_history`: versões processadas, com unicidade lógica por ticker, período, tipo, versão e método;
- `ingestion_state`: ETag, Last-Modified, tamanho, hash SHA-256, snapshot filtrado e último estado de cada ZIP;
- `ingestion_runs`: início, fim, status, contadores, warnings e erros de cada execução.
- `cash_proceeds`: dividendos e JCP normalizados por ticker, classe e evento;
- `dividend_sync_state`: última consulta e estado incremental de cada emissor na B3.

As migrations ficam em `db/migrations` e são aplicadas em ordem, uma única vez.

## Sincronização das companhias

O comando abaixo pode ser executado isoladamente e é idempotente:

```bash
npm run sync:companies
```

A sincronização combina quatro fontes públicas:

1. valores mobiliários do FCA, para ticker e classe da ação;
2. cadastro de companhias abertas da CVM, para confirmar CNPJ, código CVM e situação ativa;
3. arquivo diário `InstrumentsConsolidated` da B3, para eliminar códigos que já não estão em negociação;
4. cadastro de companhias listadas da B3, como ponte adicional para ações ausentes do FCA, como BPAC3 e BPAC5.

Associações inexistentes, conflitantes ou ambíguas são ignoradas e registradas como aviso. A lista em `data/companies.ts` deixou de ser o catálogo principal: ela contém somente exceções explícitas e sempre prevalece sobre a descoberta automática. Companhias descobertas automaticamente que desapareçam de uma sincronização íntegra são desativadas sem apagar o histórico.

O cadastro pesado de instrumentos e companhias B3 é reutilizado por até sete dias. FCA e cadastro CVM são verificados em toda execução diária. Uma mudança no universo de empresas invalida os snapshots filtrados de ITR/DFP e força o reprocessamento necessário.

## Ingestão manual

Depois de executar `db:setup`:

```bash
npm run update:fundamentals
npm run update:dividends:full
```

`update:dividends:full` faz a carga inicial de todos os emissores. No uso cotidiano, `npm run update:market-data` atualiza os fundamentos e um lote rotativo de proventos; `npm run update:dividends` executa somente esse lote.

A pipeline primeiro sincroniza as companhias e depois consulta quatro fontes: ITR e DFP do ano atual e do anterior. Não existe uma requisição por ticker. Um `HEAD` condicional compara ETag, Last-Modified e tamanho; o ZIP só é baixado quando necessário. Após o download, o hash evita reprocessamento quando apenas os metadados HTTP mudaram.

O arquivo é descompactado em memória. Os CSVs de metadados, DRE consolidada, balanço passivo consolidado e composição do capital são lidos em streaming e filtrados antecipadamente pelos códigos CVM/CNPJs cadastrados. Nada depende do filesystem persistente da função.

Se nada mudou após uma execução íntegra, a rotina encerra sem recalcular. Uma execução anterior parcial é tentada novamente mesmo com ZIPs iguais. Falhas de uma fonte podem usar o último snapshot válido, marcado como `stale`, sem apagar fundamentos já publicados.

## Cron diário

`vercel.json` agenda `GET /api/cron/update-fundamentals` todos os dias às `11:00 UTC`, aproximadamente `08:00` em Brasília. A mesma execução atualiza os fundamentos CVM e 48 emissores de proventos por vez, em rotação pelo menos atualizado. A carga completa inicial continua sendo feita pelo CLI. Configure `CRON_SECRET` no ambiente da Vercel. Conforme o mecanismo do Vercel Cron, ele é enviado como:

```http
Authorization: Bearer <CRON_SECRET>
```

Uma chamada manual equivalente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://seu-dominio.example/api/cron/update-fundamentals
```

A comparação do segredo usa tempo constante. Requisições sem credencial recebem `401`; uma segunda execução simultânea recebe `409`. A exclusão mútua usa `pg_try_advisory_lock`, válida entre instâncias serverless. A rota é dinâmica, roda em Node.js e declara `maxDuration = 300`.

## Seleção e reapresentações

Para cada código CVM, tipo e data de referência, a seleção ordena por:

1. data de referência;
2. versão oficial;
3. data de recebimento;
4. `ID_DOC` oficial.

Uma versão superior ou, em empate, um recebimento/ID mais recente vence. O fundamento atual nunca é substituído por um documento efetivamente mais antigo. O identificador do método inclui a revisão da pipeline, para que uma correção contábil possa recalcular o mesmo documento. A inserção histórica usa restrição única e `ON CONFLICT DO NOTHING`, tornando o reprocessamento idempotente dentro da mesma revisão.

## Decisões contábeis e limitações

### LPA

A pipeline calcula o indicador no nível da companhia: `lucro atribuível aos controladores / total de ações emitidas`. Ela prefere as demonstrações consolidadas e usa as individuais quando a companhia não publica o conjunto consolidado necessário. As linhas oficiais de resultado por ação são usadas somente para reconciliar se a quantidade de ações foi informada em unidades ou milhares.

- DFP que cubra pelo menos 330 dias: divide o lucro anual atribuível aos controladores pela quantidade de ações emitidas na data do documento.
- ITR: calcula o lucro dos últimos 12 meses pela ponte `DFP anual anterior + ITR acumulado atual - ITR acumulado comparável do ano anterior` e então o divide pelas ações emitidas mais recentes.
- Valores acumulados nunca são somados como trimestres isolados.
- Sem a DFP anual ou o ITR comparável exato, o LPA fica indisponível.
- Lucro negativo é preservado como fundamento, embora impeça o Número de Graham.

A primeira versão assume exercício social encerrado em 31 de dezembro para a ponte TTM dos emissores cadastrados. Emissores com calendário diferente precisam de uma regra adicional validada.

### VPA

O cálculo é `patrimônio líquido atribuível aos controladores / total de ações emitidas`, usando o mesmo denominador do LPA.

- A pipeline prefere uma linha consolidada explicitamente descrita como patrimônio líquido atribuído aos controladores.
- Na ausência dela, usa patrimônio líquido consolidado menos participação de não controladores; para companhias sem demonstração consolidada adequada, usa o patrimônio líquido individual.
- `MIL` é multiplicado por 1.000; `REAL`/`UNIDADE` é mantido. Moeda ou escala desconhecida bloqueia o resultado.
- A quantidade vem do arquivo oficial de composição do capital e soma todas as classes emitidas, sem descontar ações em tesouraria, seguindo a convenção dos indicadores de mercado usados como referência.
- Como o dicionário oficial não declara unidade para as colunas `QT_ACAO_*` e há emissores que entregam a quantidade em milhares, a quantidade é reconciliada com `lucro atribuível ao controlador / LPA básico`. Razão próxima de 1 mantém o valor; razão próxima de 1.000 aplica o fator 1.000 e registra essa decisão em `calculation_details`; razões incompatíveis bloqueiam o resultado.
- Patrimônio negativo é preservado como fundamento, embora impeça o Número de Graham. Quantidade não positiva, valor incoerente ou campos ausentes deixam o cálculo indisponível.

A CVM não fornece, nessa composição, LPA e VPA patrimonial separados por classe. Por isso todas as ações da mesma companhia recebem os mesmos indicadores calculados no nível da empresa. Ações ON de final 3 e preferenciais de finais 4 a 8 são candidatas ao cálculo automático. Units, FIIs, ETFs, BDRs e outros ativos permanecem não suportados; quando não houver cálculo automático, a calculadora manual continua disponível como fluxo independente.

Desdobramentos e grupamentos são refletidos pela composição do capital do mesmo documento. A aplicação não ajusta silenciosamente períodos incompatíveis.

## Validação, transação e diagnóstico

Antes da publicação são validados números finitos, data ISO, código CVM, escala monetária, ações positivas e limites configuráveis. Variações acima de 80% no LPA, 50% no VPA ou 30% na quantidade de ações geram warnings.

Histórico, fundamento atual, estado das fontes e contadores são gravados numa transação. Um erro transitório não apaga o valor anterior nem bloqueia necessariamente os demais. Quando a versão da metodologia muda e uma execução completa termina com fontes íntegras, resultados da metodologia anterior que deixaram de ser suportados são retirados da tabela atual, mas permanecem no histórico. Logs são JSON resumido e não incluem URLs de banco, tokens, segredos ou conteúdo integral dos CSVs.

## Modo de demonstração

O modo demo só existe com:

```env
ENABLE_DEMO_DATA=true
```

O padrão, inclusive em desenvolvimento, é `false`. Quando ativado, cotação e fundamentos simulados vêm juntos e continuam rotulados como demonstração; a aplicação não combina silenciosamente uma cotação real com fundamentos simulados. Em produção, mantenha a variável ausente ou `false`.

## Exceções manuais de cadastro

O cadastro normal não exige edição de código. Quando uma associação oficial precisar de correção explícita, adicione a exceção a `data/companies.ts`, execute `npm run db:seed` e depois `npm run update:fundamentals`. O seed prevalece sobre a descoberta automática. Para retirar uma exceção da ingestão sem perder histórico, defina `isActive: false`.

## Desenvolvimento e qualidade

```bash
npm run dev
npm run test
npm run lint
npm run build
```

As fixtures em `test/fixtures/cvm` reproduzem os cabeçalhos reais dos CSVs oficiais em arquivos pequenos. Os testes cobrem normalização, versões/reapresentações, LPA, VPA, política de persistência, idempotência e proteção do cron.

## Limites serverless

Os ZIPs anuais podem crescer, e o tempo total varia com a CVM e o provedor. A rota tem limite explícito de 300 segundos. O parsing é streaming, mas o ZIP baixado permanece em memória e os snapshots filtrados ficam no Postgres. Monitore `ingestion_runs` e os logs no primeiro deploy; se o conjunto de empresas crescer a ponto de exceder memória ou duração do plano, a menor evolução recomendada é dividir a execução por fonte/ano mantendo a mesma pipeline e trava, não criar um microserviço.

## Troubleshooting

- `DATABASE_URL não configurada`: crie `.env.local`, reinicie o servidor e rode migration/seed.
- Busca sem resultados: execute `npm run sync:companies` e confirme `companies.is_active`.
- Cotação indisponível: confira `BRAPI_TOKEN`, limites e cobertura da brapi.dev.
- Cron retorna `401`: `CRON_SECRET` do ambiente e header precisam ser idênticos.
- Cron retorna `409`: outra ingestão detém o advisory lock; aguarde a conclusão.
- Execução `partial`: consulte a linha mais recente de `ingestion_runs` e os logs estruturados; o próximo run tentará novamente.
- Fonte `stale`: a consulta à CVM falhou e o último snapshot válido foi preservado.
- LPA/VPA indisponível: confira nos logs a conta, classe, período ou composição de capital ausente; a pipeline evita aproximações silenciosas.

## Aviso

O Número de Graham e o preço-teto de Bazin são métricas isoladas. O conteúdo é educacional e não representa recomendação de compra ou venda.
