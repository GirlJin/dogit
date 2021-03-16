const fs = require('fs');
const path = require('path');
const { echo } = require('../../lib/helper');
const ora = require('ora');
module.exports = class ConfigGet {
    constructor(configPath) {
        this.configPath = configPath
    }
    // 读取配置
    readTemplate() {
        const spinner = ora('正在获取系统配置..').start();
        this.configList = fs.readFileSync(this.configPath, 'utf-8');
        const type = JSON.parse(this.configList);
        spinner.succeed('系统配置获取成功')
        echo(JSON.stringify(type,null, '\t'),'success')
    }

    start() {
        this.readTemplate();
    }
}