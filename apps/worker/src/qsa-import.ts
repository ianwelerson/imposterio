/**
 * @file qsa-import.ts
 * @description ETL pipeline for the Federal Revenue QSA bulk dataset.
 *
 * The Federal Revenue (Receita Federal) publishes monthly bulk files
 * containing the complete registry of Brazilian companies, their
 * establishments, and partner/shareholder (QSA) relationships.
 *
 * This worker downloads, extracts, and imports the dataset into PostgreSQL
 * (Neon), enabling O(log n) CPF-to-company lookups that are impossible
 * to perform via real-time API queries across ~60 million CNPJs.
 *
 * Official source: https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9
 * Faster mirror:   https://dados-abertos-rf-cnpj.casadosdados.com.br/
 * Schema layout:   https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf
 *
 * Generated tables: company, establishment, partner, simples
 * Required indexes: cnpj_basico on all tables + cnpj_cpf_socio on partner
 *
 * @see DECISIONS.md entry: "Federal Revenue QSA bulk stored in proprietary PostgreSQL"
 */

// TODO: Implement QSA import pipeline
