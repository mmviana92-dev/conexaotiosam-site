# Conexão Tio Sam — site

Site estático do canal [Conexão Tio Sam](https://www.youtube.com/@conexaotiosam_): início, vídeos (feed RSS público do
YouTube, sem chave de API), guias com fontes oficiais, sobre, contato, privacidade e termos. Sem cookies e sem rastreadores.

- Gerar as páginas: `node scripts/build.mjs` (Node 18+, sem dependências). `--offline` usa a última lista de vídeos salva.
- A GitHub Action `Atualizar vídeos` roda a cada 6 horas e publica a lista nova.
- Hospedagem: GitHub Pages (branch `main`, pasta raiz).
