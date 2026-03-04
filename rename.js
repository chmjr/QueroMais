const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'assets');
const files = fs.readdirSync(dir);

const renames = {
    'Cópia de Quero + 1.png': 'quero_mais_1.png',
    'Quero + 3.png': 'quero_mais_3.png',
    'Quero + 5+1 (1).png': 'quero_mais_6.png',
    'Quero + 12.png': 'quero_mais_12.png'
};

for (const file of files) {
    if (renames[file] || renames[file.normalize('NFD')] || renames[file.normalize('NFC')]) {
        const target = renames[file] || renames[file.normalize('NFD')] || renames[file.normalize('NFC')];
        console.log(`Renaming: "${file}" to "${target}"`);
        fs.renameSync(path.join(dir, file), path.join(dir, target));
    }
}
