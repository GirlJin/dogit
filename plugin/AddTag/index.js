const fs = require('fs');
const { exec, execSync } = require('child_process');
const prompts = require('prompts');
const ora = require('ora');
const { echo } = require('../../lib/helper');
const { isGitRoot, fetchRemote, guessNextTag, allTags } = require('../../lib/git');

const I18 = require('../../lib/i18');
const i18 = new I18();

module.exports = class AddTag {
    constructor({ option, hook }, handler) {
        this.option = option;
        this.hook = hook;
        this.handler = handler;
    }

    // 验证环境
    async checkEnv() {
        if (!await isGitRoot()) {
            echo(i18.__('tip.not-git-root'), 'error');
            return false;
        }

        const spinner = ora('正在fetch远程仓库..').start();
        await fetchRemote()
        spinner.succeed('同步远程仓库成功');

        return true;
    }

    // 获取交互参数
    async getParams() {
        this.params = await prompts([
            {
                type: 'select',
                name: 'env',
                message: '请选择要打Tag的环境',
                choices: Object.keys(this.option.envs).map(item => {
                    return { title: item, value: item }
                }),
                initial: 0
            }
        ], {
            onCancel() {
                process.exit();
            }
        });

        this.params.tagPrefix = this.option.envs[this.params.env].prefix
        this.envTags = await allTags(this.params.tagPrefix);
        this.showLatestEnvTag()

        const moreParams = await prompts([
            {
                type: 'text',
                name: 'version',
                message: `请输入版本号（推荐 ${guessNextTag(this.prevVersion)}）`,
                validate: value => !value ? `描述信息不能为空` : (this.envTags.includes(`${this.params.tagPrefix}${value}`) ? '该版本号已存在' : true)
            },
            {
                type: 'text',
                name: 'message',
                message: '请输入Tag描述信息',
                validate: value => !value ? `描述信息不能为空` : true
            }
        ], {
            onCancel() {
                process.exit();
            }
        });

        this.params = {
            ...this.params,
            ...moreParams,
            tag: `${this.params.tagPrefix}${moreParams.version}`
        }

        const isStart = await prompts([
            {
                type: 'toggle',
                name: 'value',
                message: `你即将打的Tag号为 ${this.params.tag} 确定无误开始执行？`,
                initial: true,
                active: 'yes',
                inactive: 'no'
            }
        ], {
            onCancel() {
                process.exit();
            }
        });
        if (!isStart.value) {
            process.exit();
        }
    }

    // 展示最新的环境tag
    showLatestEnvTag() {
        this.prevTag = this.envTags[0] || '';
        this.prevVersion = this.prevTag.split(this.params.tagPrefix)[1];
        if (this.prevTag) {
            echo(`${this.params.env} 环境的最近一次Tag为 ${this.prevTag}`);
        } else {
            echo(`${this.params.env} 尚未打过Tag`);
        }
    }

    // 打Tag
    async addTag() {
        return new Promise(resolve => {
            const command = `git tag -a ${this.params.tag} -m "${this.params.message}"`
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    echo(stderr, 'info')
                    process.exit();
                } else {
                    resolve();
                }
            });
        })
    }
    // 询问是否推送到远程分支
    async getPushParams() {
        const isPush = await prompts([
            {
                type: 'toggle',
                name: 'value',
                message: '是否将tag推送到远程仓库？',
                initial: true,
                active: 'yes',
                inactive: 'no'
            }
        ]);
        if (!isPush.value) {
            return true;
        }
        this.pushParams = await prompts([
            {
                type: 'text',
                name: 'env',
                message: '请输入要push的环境',
                initial: 0
            }
        ], {
            onCancel() {
                process.exit();
            }
        });
        return new Promise(resolve => {
            const command = `git push origin ${this.pushParams.env}  "${this.params.tag}"`
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    echo(stderr, 'info')
                    process.exit();
                } else {
                    resolve();
                }
            });
        })
    }
    
    // 开始运行
    async start() {
        if (!await this.checkEnv()) {
            process.exit();
        }
        await this.getParams();
        await this.handler(this.hook.before, this.params);
        await this.addTag();
        await this.handler(this.hook.after, this.params);
    };
    async push() {
        await this.getPushParams();
    }
}
