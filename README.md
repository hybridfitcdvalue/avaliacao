# HYBRID Fit — Avaliação Físico-Funcional (PWA)

App instalável de avaliação físico-funcional para **idosos, adultos (25–55) e atletas**.
Dados gravados **localmente em cada aparelho** (IndexedDB), sem sincronização e sem servidor.

## Conteúdo do pacote

```
hybrid-fit-avaliacao/
├── index.html            # aplicação
├── manifest.json         # identidade do app instalável
├── service-worker.js     # funcionamento offline
├── js/db.js              # camada de dados (IndexedDB)
├── assets/               # ícones do app
└── README.md
```

## Como colocar no ar (necessário para instalar e para o IndexedDB funcionar 100%)

O app precisa ser servido por **HTTPS**. Opções gratuitas:

- **Netlify Drop:** acesse app.netlify.com/drop e arraste a pasta `hybrid-fit-avaliacao`. Sai um link `https://` na hora.
- **GitHub Pages:** suba a pasta num repositório e ative Pages nas configurações.
- **Vercel / Cloudflare Pages:** importe a pasta e publique.

Abra o link publicado no celular e escolha **Instalar** (Android/desktop) ou **Adicionar à Tela de Início** (iPhone, no Safari).

## Teste rápido no computador (sem publicar)

Abrir o `index.html` direto no navegador funciona para digitar e calcular, e o **IndexedDB** grava normalmente. O que **não** funciona em `file://` é a instalação como app (o *service worker* exige `http/https`). Para testar a instalação localmente:

```
cd hybrid-fit-avaliacao
python3 -m http.server 8000
# abra http://localhost:8000
```

## Persistência e backup

- Os dados ficam **apenas neste aparelho**. Trocar de celular **não** leva os dados junto.
- Use **Exportar (.json)** para backup e para transferir a outro aparelho (lá, use **Importar**).
- **Exportar (.csv)** gera planilha para análise agregada.

## Substituir a marca

Troque os arquivos em `assets/` pela logomarca oficial da HYBRID Fit (mesmos nomes e tamanhos: 192, 512 e maskable 512) e ajuste as cores no topo do `<style>` em `index.html` (variáveis `--petrol`, `--amber` etc.).

## Aviso

Ferramenta de apoio à decisão para uso profissional. Não substitui julgamento clínico nem diagnóstico médico. Protocolos com referências indicadas no próprio app.

© HYBRID Fit
