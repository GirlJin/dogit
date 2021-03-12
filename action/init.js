const fs = require('fs');
const path = require('path');
const { echo } = require('../lib/helper');

module.exports = class Init {
    // 读取配置
    readTemplate() {
        this.template = fs.readFileSync(path.resolve(__dirname, '../template/dogit.config.js'), 'utf-8');
    }

    // 写入配置
    writeConfig() {
        fs.writeFileSync(path.resolve(process.cwd(), 'dogit.config.js'), this.template);
    }

    start() {
        this.readTemplate();
        this.writeConfig();
        echo('写入配置文件成功', 'success');
    }
}