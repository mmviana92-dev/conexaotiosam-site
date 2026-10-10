// Builds the static site of the Conexão Tio Sam channel: every page from one layout, and the Videos page from the
// channel's public YouTube RSS feed (no API key). Usage: node scripts/build.mjs [--offline]
// Runs locally and in the GitHub Action (every 6 hours), which commits the updated pages.
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = {
  name: 'Conexão Tio Sam',
  // GITHUB_REPOSITORY (owner/repo) in the GitHub Action; the owner's account otherwise.
  url: process.env.SITE_URL || `https://${(process.env.GITHUB_REPOSITORY || 'mmviana92-dev/conexaotiosam-site').split('/')[0].toLowerCase()}.github.io/conexaotiosam-site`,
  channel: 'https://www.youtube.com/@conexaotiosam_?sub_confirmation=1',
  channelId: 'UCL3YaNlXM4EVWW6CaJ9kIpA',
  email: 'conexaotiosan@gmail.com',
  description: 'Vida real de brasileiro nos Estados Unidos: custo de vida, documentos, trabalho e finanças em Boston e Massachusetts, sempre com fontes oficiais.'
};
const UPDATED = '10 de outubro de 2026';
// Old versions of a corrected video never appear here, even if the feed lists them for a while.
const HIDDEN_VIDEOS = new Set(['aPXFF6c5Vyw', 'Bnsw4i1EtmA']);
const UPDATED_EN = 'October 10, 2026';

const escape = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MENU = [
  ['index.html', 'Início'],
  ['videos.html', 'Vídeos'],
  ['guias/index.html', 'Guias'],
  ['sobre.html', 'Sobre'],
  ['contato.html', 'Contato']
];

const YT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z"/></svg>';

function layout({ path, title, description, body, lang = 'pt-BR' }) {
  const depth = path.split('/').length - 1;
  const base = depth ? '../'.repeat(depth) : '';
  const pageUrl = `${SITE.url}/${path === 'index.html' ? '' : path}`;
  const fullTitle = path === 'index.html' ? `${SITE.name} — Vida real de brasileiro nos EUA` : `${title} | ${SITE.name}`;
  const menu = MENU.map(([href, label]) => `<li><a href="${base}${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(fullTitle)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${escape(fullTitle)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${SITE.url}/assets/og-image.png">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b1630">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="site-header">
  <nav class="container nav" aria-label="Principal">
    <a class="brand" href="${base}index.html"><span class="brand-mark">CTS</span> ${SITE.name}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
    <ul class="menu" id="menu">${menu}</ul>
  </nav>
</header>
<main id="conteudo">
${body}
</main>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div><strong style="color:#fff">${SITE.name}</strong><br>Vida real de brasileiro nos Estados Unidos.</div>
      <ul class="footer-links">
        <li><a href="${SITE.channel}" rel="noopener">YouTube</a></li>
        <li><a href="${base}guias/index.html">Guias</a></li>
        <li><a href="${base}contato.html">Contato</a></li>
        <li><a href="${base}privacy.html">Privacidade / Privacy</a></li>
        <li><a href="${base}terms.html">Termos / Terms</a></li>
      </ul>
    </div>
    <p class="footer-note">O conteúdo deste site e do canal é informativo e não substitui a orientação de um advogado, contador ou outro profissional habilitado. Este site não usa cookies nem rastreadores.</p>
  </div>
</footer>
<script>
  // Menu on small screens (no tracking, no cookies).
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  toggle.addEventListener('click', () => { const open = menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
</script>
</body>
</html>
`;
}

// Guides: one per published topic, a short summary and only official sources (facts already verified).
const GUIDES = [
  {
    slug: 'agendamento-consulado-boston',
    title: 'Agendamento no Consulado do Brasil em Boston',
    summary: 'Como funciona o agendamento de passaporte, CPF, procuração e outros serviços no Consulado-Geral do Brasil em Boston.',
    video: 'kfl3foZbDYk',
    points: [
      'O agendamento é feito pelo e-consular, o sistema oficial do Itamaraty para o Consulado-Geral do Brasil em Boston.',
      'Pelo e-consular você agenda serviços como passaporte, CPF, procuração e outros serviços consulares.',
      'Antes de ir, confira no site oficial o endereço, os documentos pedidos e se o serviço exige agendamento.'
    ],
    sources: [
      ['e-consular — Consulado-Geral do Brasil em Boston (Itamaraty)', 'https://ec-boston.itamaraty.gov.br/'],
      ['Consulado-Geral do Brasil em Boston — página no Mass.gov', 'https://www.mass.gov/locations/brazil']
    ]
  },
  {
    slug: '5-erros-ao-chegar-nos-eua',
    title: '5 erros que brasileiros cometem ao chegar nos EUA',
    summary: 'Crédito, contas atrasadas, conta da empresa separada e reserva de emergência: o básico das finanças para quem está chegando.',
    video: 'IsuJXsJ0-uU',
    points: [
      'O credit score pesa na hora de alugar, financiar um carro e até no preço do seguro, segundo o CFPB (órgão federal de proteção ao consumidor).',
      'Quem não tem histórico de crédito fica "invisível" para o sistema de crédito americano; o CFPB tem um guia de como começar.',
      'Um cartão de crédito "secured" pede um depósito; usar pouco e pagar a fatura inteira todo mês ajuda a construir histórico.',
      'Atrasos em contas podem ficar no seu relatório de crédito por anos (CFPB).',
      'Separar a conta da empresa da conta pessoal facilita os impostos (IRS), e a SBA recomenda abrir uma conta bancária comercial ao registrar a empresa.',
      'Uma reserva de emergência de três a seis meses de despesas básicas é a recomendação comum em guias oficiais de educação financeira.'
    ],
    sources: [
      ['CFPB — What is a credit score?', 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-score-en-315/'],
      ['CFPB — Consumers who are credit invisible', 'https://www.consumerfinance.gov/archive/newsroom/cfpb-report-finds-26-million-consumers-are-credit-invisible/'],
      ['CFPB — Credit invisible checklist (PDF)', 'https://files.consumerfinance.gov/f/documents/201612_cfpb_credit_invisible_checklist.PDF'],
      ['CFPB — How long does information stay on my credit report?', 'https://www.consumerfinance.gov/ask-cfpb/how-long-does-information-stay-on-my-credit-report-en-323/'],
      ['IRS — Income & expenses (small business)', 'https://www.irs.gov/faqs/small-business-self-employed-other-business/income-expenses/income-expenses-1'],
      ['SBA — Open a business bank account', 'https://www.sba.gov/business-guide/launch-your-business/open-business-bank-account'],
      ['State of Illinois (CMS) — Emergency fund', 'https://cms.illinois.gov/benefits/stateemployee/bewell/financialwellness/february2024-emergency-fund.html']
    ]
  }
];

const NOTICE = '<p class="notice">Conteúdo informativo, com base em fontes oficiais na data da publicação. Não substitui a orientação de um advogado, contador ou outro profissional habilitado. Regras e valores mudam: confira sempre a fonte oficial.</p>';

function guidePage(guide) {
  return layout({
    path: `guias/${guide.slug}.html`,
    title: guide.title,
    description: guide.summary,
    body: `<section class="page-hero"><div class="container"><span class="eyebrow">Guia</span><h1>${escape(guide.title)}</h1><p>${escape(guide.summary)}</p></div></section>
<section class="section"><div class="container prose">
<h2>O essencial</h2>
<ul>${guide.points.map(point => `<li>${escape(point)}</li>`).join('')}</ul>
<p><a class="btn btn-primary" href="https://www.youtube.com/watch?v=${guide.video}" rel="noopener">${YT_ICON} Assistir ao vídeo</a></p>
<div class="sources"><strong>Fontes oficiais</strong><ul>${guide.sources.map(([label, url]) => `<li><a href="${url}" rel="noopener">${escape(label)}</a></li>`).join('')}</ul></div>
${NOTICE}
<p><a href="index.html">← Todos os guias</a></p>
</div></section>`
  });
}

async function fetchVideos(offline) {
  const cache = join(ROOT, 'assets', 'videos.json');
  if (!offline) {
    try {
      const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${SITE.channelId}`, { signal: AbortSignal.timeout(30000) });
      if (response.ok) {
        const xml = await response.text();
        const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
          id: (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1],
          title: (entry.match(/<title>([^<]+)<\/title>/) || [])[1],
          published: (entry.match(/<published>([^<]+)<\/published>/) || [])[1]
        })).filter(video => video.id && video.title && !HIDDEN_VIDEOS.has(video.id))
          .map(video => ({ ...video, title: video.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }));
        await writeFile(cache, `${JSON.stringify({ updated: new Date().toISOString(), videos }, null, 2)}\n`);
        return videos;
      }
    } catch (error) {
      console.warn(`RSS indisponível (${error.message}); usando a última lista salva.`);
    }
  }
  try {
    return (JSON.parse(await readFile(cache, 'utf8')).videos || []).filter(video => !HIDDEN_VIDEOS.has(video.id));
  } catch {
    return [];
  }
}

function videoCard(video) {
  const date = new Date(video.published);
  const shown = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
  return `<a class="video" href="https://www.youtube.com/watch?v=${escape(video.id)}" rel="noopener">
  <img class="thumb" src="https://i.ytimg.com/vi/${escape(video.id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
  <div class="meta"><h3>${escape(video.title)}</h3>${shown ? `<time datetime="${escape(video.published)}">${shown}</time>` : ''}</div>
</a>`;
}

const pages = {
  'index.html': videos => layout({
    path: 'index.html', title: 'Início', description: SITE.description,
    body: `<section class="hero"><div class="container">
  <span class="eyebrow">Canal no YouTube</span>
  <h1>Vida real de brasileiro nos <span class="accent">Estados Unidos</span></h1>
  <p class="lead">O Conexão Tio Sam é o canal do Michel, empreendedor brasileiro em Boston e dono de empresas de construção. Aqui você encontra o que muda a vida de quem mora ou quer morar nos EUA, explicado em português e com fontes oficiais.</p>
  <div class="actions">
    <a class="btn btn-primary" href="${SITE.channel}" rel="noopener">${YT_ICON} Inscreva-se no canal</a>
    <a class="btn btn-ghost" href="videos.html">Ver os vídeos</a>
  </div>
</div></section>
<section class="section"><div class="container">
  <div class="section-head"><h2>O que o canal ensina</h2><p>Temas práticos para o dia a dia de brasileiros em Boston e Massachusetts, sem promessa fácil e sem achismo.</p></div>
  <div class="grid">
    <div class="card"><div class="icon">$</div><h3>Custo de vida</h3><p>Aluguel, contas, carro e mercado: quanto custa morar em Boston e Massachusetts.</p></div>
    <div class="card"><div class="icon">📄</div><h3>Documentos</h3><p>Consulado, passaporte, CPF e outros documentos, com o passo a passo e os sites oficiais.</p></div>
    <div class="card"><div class="icon">⚖️</div><h3>Imigração com fontes</h3><p>Regras e mudanças explicadas com base em páginas do governo, sem alarmismo.</p></div>
    <div class="card"><div class="icon">🔨</div><h3>Trabalho e negócios</h3><p>Profissões, empresa própria e finanças para quem trabalha ou empreende nos EUA.</p></div>
  </div>
</div></section>
<section class="section alt"><div class="container">
  <div class="section-head"><h2>Vídeos recentes</h2><p>Os vídeos públicos mais novos do canal.</p></div>
  <div class="grid">${videos.slice(0, 3).map(videoCard).join('') || '<p>Os vídeos aparecem aqui assim que forem publicados.</p>'}</div>
  <div class="actions"><a class="btn btn-primary" href="videos.html">Todos os vídeos</a></div>
</div></section>
<section class="section"><div class="container">
  <div class="section-head"><h2>Guias com fontes oficiais</h2><p>Um resumo curto de cada tema já publicado, com os links das fontes oficiais.</p></div>
  <div class="grid">${GUIDES.map(guide => `<a class="card" href="guias/${guide.slug}.html"><span class="tag">Guia</span><h3>${escape(guide.title)}</h3><p>${escape(guide.summary)}</p></a>`).join('')}</div>
</div></section>`
  }),
  'videos.html': videos => layout({
    path: 'videos.html', title: 'Vídeos', description: 'Todos os vídeos públicos do canal Conexão Tio Sam no YouTube.',
    body: `<section class="page-hero"><div class="container"><h1>Vídeos</h1><p>Os vídeos públicos do canal, direto do YouTube. A lista é atualizada sozinha várias vezes por dia.</p></div></section>
<section class="section"><div class="container">
  <div class="grid">${videos.map(videoCard).join('') || '<p>Nenhum vídeo público no momento.</p>'}</div>
  <div class="actions"><a class="btn btn-primary" href="${SITE.channel}" rel="noopener">${YT_ICON} Inscreva-se no canal</a></div>
</div></section>`
  }),
  'guias/index.html': () => layout({
    path: 'guias/index.html', title: 'Guias', description: 'Guias curtos dos temas do canal Conexão Tio Sam, com links das fontes oficiais.',
    body: `<section class="page-hero"><div class="container"><h1>Guias</h1><p>Um guia por tema já publicado no canal: o essencial em poucas linhas e os links das fontes oficiais.</p></div></section>
<section class="section"><div class="container">
  <div class="grid">${GUIDES.map(guide => `<a class="card" href="${guide.slug}.html"><span class="tag">Guia</span><h3>${escape(guide.title)}</h3><p>${escape(guide.summary)}</p></a>`).join('')}</div>
  <div style="margin-top:2rem">${NOTICE}</div>
</div></section>`
  }),
  'sobre.html': () => layout({
    path: 'sobre.html', title: 'Sobre', description: 'Quem está por trás do canal Conexão Tio Sam e como o conteúdo é feito.',
    body: `<section class="page-hero"><div class="container"><h1>Sobre o canal</h1><p>Quem está por trás do Conexão Tio Sam e como o conteúdo é feito.</p></div></section>
<section class="section"><div class="container prose">
<h2>Quem é o Michel</h2>
<p>Michel é empreendedor brasileiro, mora em Boston, Massachusetts, e é dono de empresas de construção. No Conexão Tio Sam, ele fala sobre a vida real de brasileiro nos Estados Unidos.</p>
<h2>Como o conteúdo é feito</h2>
<ul>
  <li>Todo número, lei ou regra citada vem de uma fonte oficial (sites do governo e de órgãos públicos). Sem fonte, a informação não entra.</li>
  <li>Temas jurídicos e de documentos usam só fontes do governo e trazem o aviso de que não substituem um advogado.</li>
  <li>Os vídeos podem usar narração com a voz do Michel gerada por inteligência artificial e imagens de banco de imagens ou geradas por IA; esses vídeos são marcados como conteúdo alterado/sintético no YouTube.</li>
  <li>O canal não promete resultado, aprovação ou elegibilidade: cada caso é diferente.</li>
</ul>
${NOTICE}
<p><a class="btn btn-primary" href="${SITE.channel}" rel="noopener">${YT_ICON} Inscreva-se no canal</a></p>
</div></section>`
  }),
  'contato.html': () => layout({
    path: 'contato.html', title: 'Contato', description: 'Fale com o canal Conexão Tio Sam.',
    body: `<section class="page-hero"><div class="container"><h1>Contato</h1><p>Parcerias, sugestões de tema ou correções: escreva para o e-mail abaixo.</p></div></section>
<section class="section"><div class="container prose">
<p style="font-size:1.25rem"><a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p>O canal não presta consultoria jurídica, de imigração ou financeira individual. Para o seu caso, procure um profissional habilitado.</p>
<p>Encontrou um erro num vídeo ou guia? Mande o link e a fonte oficial: a correção é feita assim que confirmada.</p>
</div></section>`
  }),
  'privacy.html': () => layout({
    path: 'privacy.html', title: 'Privacy Policy / Política de Privacidade', lang: 'en',
    description: 'Privacy policy of the Conexão Tio Sam website and of agentTube, the private app the channel owner uses to upload and manage his own YouTube videos.',
    body: `<section class="page-hero"><div class="container"><h1>Privacy Policy</h1><p>Política de Privacidade — versão em português abaixo. Last updated / Atualizado em: ${UPDATED_EN}.</p></div></section>
<section class="section"><div class="container prose">
<h2>English</h2>
<h3>Who we are</h3>
<p>This website belongs to the Conexão Tio Sam YouTube channel (youtube.com/@conexaotiosam_), owned and operated by Michel Viana. Contact: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
<h3>This website</h3>
<p>This website does not use cookies, analytics, advertising or any tracking. It has no accounts and no forms, and it does not collect personal data. Video thumbnails are loaded from YouTube's image servers (i.ytimg.com), and links to videos open on YouTube, which is governed by Google's own privacy policy. The site is hosted on GitHub Pages, which may keep standard technical logs (such as IP addresses) for security.</p>
<h3>The agentTube app</h3>
<p>agentTube is a private application used only by the channel owner, Michel Viana, to upload and manage videos on his own YouTube channel through the YouTube Data API. It is not offered to the public and has no other users.</p>
<ul>
  <li><strong>Data accessed:</strong> only the owner's own YouTube channel, through the scopes he authorizes (for example, uploading videos, setting titles, descriptions, thumbnails, captions and publishing dates, and reading his channel's video status, comments and analytics).</li>
  <li><strong>Use:</strong> the data is used only to provide these functions to the owner on his own channel.</li>
  <li><strong>No third-party data:</strong> agentTube does not collect, sell, rent or share data of any third party. It does not transfer Google user data to anyone, does not use it for advertising, and does not use it to train AI models.</li>
  <li><strong>Storage:</strong> the OAuth tokens are stored only on the owner's own computer and are never published or sent to other parties.</li>
  <li><strong>Limited Use:</strong> agentTube's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
  <li><strong>How to revoke access:</strong> the account owner can remove agentTube's access at any time at <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>. Removing access stops the app from using the channel; tokens stored locally become invalid.</li>
  <li><strong>Data deletion:</strong> to request deletion of any data related to agentTube, write to <a href="mailto:${SITE.email}">${SITE.email}</a>.</li>
</ul>
<h3>Changes</h3>
<p>Changes to this policy are published on this page with a new date.</p>

<div class="lang">
<h2>Português</h2>
<h3>Quem somos</h3>
<p>Este site pertence ao canal Conexão Tio Sam no YouTube (youtube.com/@conexaotiosam_), de propriedade de Michel Viana, que também o administra. Contato: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
<h3>Este site</h3>
<p>Este site não usa cookies, ferramentas de análise, anúncios nem qualquer rastreamento. Não tem contas nem formulários e não coleta dados pessoais. As miniaturas dos vídeos são carregadas dos servidores de imagem do YouTube (i.ytimg.com), e os links dos vídeos abrem no YouTube, que segue a política de privacidade do Google. O site é hospedado no GitHub Pages, que pode guardar registros técnicos comuns (como endereço IP) por segurança.</p>
<h3>O app agentTube</h3>
<p>O agentTube é um aplicativo privado, usado só pelo dono do canal, Michel Viana, para enviar e gerenciar vídeos no próprio canal do YouTube por meio da YouTube Data API. Ele não é oferecido ao público e não tem outros usuários.</p>
<ul>
  <li><strong>Dados acessados:</strong> só o próprio canal do dono, dentro das permissões que ele autoriza (por exemplo: enviar vídeos; definir títulos, descrições, thumbnails, legendas e datas de publicação; e ler o status dos vídeos, os comentários e as estatísticas do canal).</li>
  <li><strong>Uso:</strong> os dados servem só para essas funções, no próprio canal do dono.</li>
  <li><strong>Sem dados de terceiros:</strong> o agentTube não coleta, não vende, não aluga e não compartilha dados de terceiros. Não transfere dados de usuários do Google a ninguém, não os usa para publicidade e não os usa para treinar modelos de IA.</li>
  <li><strong>Armazenamento:</strong> os tokens de acesso (OAuth) ficam só no computador do dono e nunca são publicados nem enviados a outras pessoas.</li>
  <li><strong>Uso limitado:</strong> o uso e a transferência de informações recebidas das APIs do Google pelo agentTube seguem a <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">Google API Services User Data Policy</a>, incluindo os requisitos de Uso Limitado (Limited Use).</li>
  <li><strong>Como revogar o acesso:</strong> o dono da conta pode remover o acesso do agentTube a qualquer momento em <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>. Com o acesso removido, o app deixa de usar o canal e os tokens guardados no computador perdem a validade.</li>
  <li><strong>Exclusão de dados:</strong> para pedir a exclusão de qualquer dado ligado ao agentTube, escreva para <a href="mailto:${SITE.email}">${SITE.email}</a>.</li>
</ul>
<h3>Mudanças</h3>
<p>Mudanças nesta política são publicadas nesta página, com nova data.</p>
</div>
</div></section>`
  }),
  'terms.html': () => layout({
    path: 'terms.html', title: 'Terms of Service / Termos de Uso', lang: 'en',
    description: 'Terms of use of the Conexão Tio Sam website and of the private agentTube app.',
    body: `<section class="page-hero"><div class="container"><h1>Terms of Service</h1><p>Termos de Uso — versão em português abaixo. Last updated / Atualizado em: ${UPDATED_EN}.</p></div></section>
<section class="section"><div class="container prose">
<h2>English</h2>
<ul>
  <li><strong>Informational content:</strong> the content of this website and of the Conexão Tio Sam channel is for information only and is based on official sources available on the date of publication. It is not legal, immigration, tax or financial advice and does not replace a qualified professional. Rules and amounts change; always check the official source.</li>
  <li><strong>No guarantees:</strong> no result, approval or eligibility is promised. Each case is different.</li>
  <li><strong>External links:</strong> links to government sites and to YouTube lead to services with their own terms; we are not responsible for their content.</li>
  <li><strong>agentTube:</strong> agentTube is a private tool used only by the channel owner to manage his own YouTube channel through the YouTube API Services. By using YouTube features, the owner agrees to the <a href="https://www.youtube.com/t/terms" rel="noopener">YouTube Terms of Service</a> and the <a href="https://policies.google.com/privacy" rel="noopener">Google Privacy Policy</a>. agentTube is not offered to third parties.</li>
  <li><strong>Content rights:</strong> the texts of this website belong to the Conexão Tio Sam channel. You may share the links; copying the content requires permission.</li>
  <li><strong>Contact:</strong> <a href="mailto:${SITE.email}">${SITE.email}</a>.</li>
</ul>
<div class="lang">
<h2>Português</h2>
<ul>
  <li><strong>Conteúdo informativo:</strong> o conteúdo deste site e do canal Conexão Tio Sam é apenas informativo e se baseia em fontes oficiais disponíveis na data da publicação. Não é orientação jurídica, de imigração, tributária ou financeira e não substitui um profissional habilitado. Regras e valores mudam; confira sempre a fonte oficial.</li>
  <li><strong>Sem garantias:</strong> nenhum resultado, aprovação ou elegibilidade é prometido. Cada caso é diferente.</li>
  <li><strong>Links externos:</strong> os links para sites do governo e para o YouTube levam a serviços com termos próprios; não respondemos pelo conteúdo deles.</li>
  <li><strong>agentTube:</strong> o agentTube é uma ferramenta privada, usada só pelo dono do canal para gerenciar o próprio canal do YouTube por meio dos YouTube API Services. Ao usar recursos do YouTube, o dono concorda com os <a href="https://www.youtube.com/t/terms" rel="noopener">Termos de Serviço do YouTube</a> e com a <a href="https://policies.google.com/privacy" rel="noopener">Política de Privacidade do Google</a>. O agentTube não é oferecido a terceiros.</li>
  <li><strong>Direitos do conteúdo:</strong> os textos deste site pertencem ao canal Conexão Tio Sam. Você pode compartilhar os links; copiar o conteúdo exige autorização.</li>
  <li><strong>Contato:</strong> <a href="mailto:${SITE.email}">${SITE.email}</a>.</li>
</ul>
</div>
<p class="updated">Atualizado em ${UPDATED}.</p>
</div></section>`
  }),
  '404.html': () => layout({
    path: '404.html', title: 'Página não encontrada', description: 'Página não encontrada.',
    body: `<section class="page-hero"><div class="container"><h1>Página não encontrada</h1><p>O endereço pode ter mudado.</p></div></section>
<section class="section"><div class="container"><a class="btn btn-primary" href="index.html">Voltar ao início</a></div></section>`
  })
};

async function main() {
  const offline = process.argv.includes('--offline');
  const videos = await fetchVideos(offline);
  for (const [file, render] of Object.entries(pages)) {
    await mkdir(dirname(join(ROOT, file)), { recursive: true });
    await writeFile(join(ROOT, file), render(videos));
  }
  for (const guide of GUIDES) await writeFile(join(ROOT, 'guias', `${guide.slug}.html`), guidePage(guide));
  const urls = [...Object.keys(pages).filter(file => file !== '404.html'), ...GUIDES.map(guide => `guias/${guide.slug}.html`)];
  await writeFile(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(file => `  <url><loc>${SITE.url}/${file === 'index.html' ? '' : file}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
  console.log(`Site gerado: ${urls.length} páginas, ${videos.length} vídeos.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
