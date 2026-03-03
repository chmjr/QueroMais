const puppeteer = require('puppeteer');
const fs = require('fs');

const files = {
    'hero-product.png': 'https://pages.greatpages.com.br/queromais.pages.net.br-queromaisintense/1772551495/imagens/desktop/3526973_1_177254354469a6de3862cc7874163644.png',
    'kit-3-meses.png': 'https://pages.greatpages.com.br/queromais.pages.net.br-queromaisintense/1772551495/imagens/desktop/3526973_1_177254594448319717.png',
    'kit-6-meses.png': 'https://pages.greatpages.com.br/queromais.pages.net.br-queromaisintense/1772551495/imagens/desktop/3526973_1_177254648989146995.png',
    'kit-12-meses.png': 'https://pages.greatpages.com.br/queromais.pages.net.br-queromaisintense/1772551495/imagens/desktop/3526973_1_177254620828314213.png',
    'hero-bg.png': 'https://pages.greatpages.com.br/queromais.pages.net.br-queromaisintense/1772551495/imagens/desktop/3526973_1_177254354469a6de385ff12.png'
};

(async () => {
    const browser = await puppeteer.launch();
    for (const [name, url] of Object.entries(files)) {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({ 'Referer': 'https://queromais.pages.net.br/' });
        let viewSource = await page.goto(url);
        fs.writeFileSync(`c:/QueroMais/assets/${name}`, await viewSource.buffer());
        console.log(`Saved ${name}`);
        await page.close();
    }
    await browser.close();
})();
