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
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://queromais.pages.net.br/queromaisintense', { waitUntil: 'networkidle2' });

    for (const [name, url] of Object.entries(files)) {
        try {
            const b64 = await page.evaluate(async (imgUrl) => {
                const response = await fetch(imgUrl);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }, url);

            const base64Data = b64.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(`c:/QueroMais/assets/${name}`, Buffer.from(base64Data, 'base64'));
            console.log(`Saved ${name}`);
        } catch (e) {
            console.error(`Error saving ${name}`, e.message);
        }
    }
    await browser.close();
})();
