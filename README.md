# ✦ TokenGo

**Your work. Unexpected achievements.**

An open-source, offline-first achievement companion for **OpenAI Codex**. Collect Steam-inspired unlocks, discover hidden achievements, curate a trophy cabinet, and share locally generated cards to X or Reddit.

**[Explore the demo](https://dragonyj.github.io/TokenGo/) · [Download releases](https://github.com/DragonYJ/TokenGo/releases) · [Contribute achievements](CONTRIBUTING.md)**

![TokenGo achievement collection](docs/screenshots/collection.png)

## 中文

TokenGo 把日常使用 Codex 的足迹变成可收藏的成就。没有账号、没有后台服务器、没有遥测。正常工作，偶遇惊喜。

- **1,224 项内置成就**：60 个行为系列 × 20 档里程碑，加上 24 个独立隐藏成就。数量包含阶梯等级，并非 1,224 种独立行为。
- **右下角桌面弹卡**：不抢键盘焦点；悬停暂停；批量解锁合并提醒；支持免打扰。
- **真实本地采集**：读取 Codex 的会话 JSONL，增量处理任务、工具调用、token 和活动时间。
- **秘密档案**：未解锁时隐藏名称和条件；开放源代码中的规则并非密码学秘密。
- **六格成就展柜**：自己选择最值得展示的徽章，导出单枚成就或展柜 PNG。
- **主动分享**：本地预览、复制图片和文案，再打开 X／Reddit 发布编辑器。不会自动发布，图片需手动粘贴或上传。
- **社区扩展**：声明式 JSON 成就包、指标词汇、贡献校验和测试。
- **零自建服务器**：GitHub Releases 分发桌面程序，GitHub Pages 托管静态演示。

### 安装与运行

下载 [Releases](https://github.com/DragonYJ/TokenGo/releases) 中适合系统的安装包，或从源码运行（Node.js 22+）：

```sh
git clone https://github.com/DragonYJ/TokenGo.git
cd TokenGo
npm ci
npm start
```

安装依赖与下载程序需要联网。**正常采集和徽章生成不需要联网。** 首次启动不自动扫描；点击「开启本地采集」或「扫描历史」后才读取日志。关闭主窗口后程序留在托盘；从托盘菜单退出可以完全停止。

社区构建目前未购买 Apple／Windows 代码签名证书，macOS 安装可能需要在系统「隐私与安全性」中明确允许。不要为了安装而关闭系统全局安全保护。也可以审查源码后自行构建。

```sh
npm run demo       # 演示数据，与真实成绩隔离
npm test           # 核心行为、去重、隐私、完整性测试
npm run validate   # 校验所有成就包
npm run build      # 为当前系统构建桌面安装包
npm run site       # 生成 dist/site 静态演示
```

无界面的本地能力不依赖 Electron，也不需要安装第三方运行库：

```sh
node src/cli.mjs scan    # 一次历史扫描
node src/cli.mjs watch   # 持续本地采集，每 5 秒增量检查
```

`CODEX_HOME` 可指定 Codex 数据根目录；默认 `~/.codex`。`TOKENGO_HOME` 可指定成绩目录。桌面默认使用系统应用数据目录，CLI 默认使用 `~/.tokengo`。不要让两个进程同时写同一个成绩目录。

### 隐私与防作弊边界

成就核心不调用网络 API，不读取 API 密钥；没有统计 SDK、远程字体或远程图片。桌面渲染器拒绝网络请求。程序内的外部入口仅用于用户主动打开仓库或分享编辑器。

原始日志只在本机短暂解析；存储的是计数、摘要、事件去重标识和文件字节偏移。工作目录、模型名与工具名以摘要形式存储，不保存对话正文、命令参数或代码。导出的分享卡不含这些原始数据。静态演示使用虚构数据，与本机 Codex 日志无连接。

HMAC 状态校验与成就证据哈希链可以发现简单改档。**用户掌控设备及密钥，仍可以伪造数据；本地成就不是官方认证。** TokenGo 不提供虚构的全球稀有度或可信全球排行榜。详情见 [安全与隐私](SECURITY.md)。

### 计数口径与当前限制

- 「任务结束」依据 `task_complete`，不代表工作已通过独立验收。
- 连续活跃按**同一任务中，相邻日志活动间隔不超过 5 分钟**计算。长时间没有事件不推定仍在工作，休眠会重置活跃段。可能低估长推理或长工具运行。
- 运行分钟是观测到的 Agent 活跃时间；多会话并行可累计，不等于人类工作时长。
- 同一调用可匹配多个工具类别；分类是启发式，不代表工具操作成功。详见 [指标定义](docs/METRICS.md)。
- 目前支持未压缩的 `.jsonl`；`.jsonl.zst` 暂不支持。
- 为避免历史回放刷成就，识别到的分叉会话整体跳过，含其后续新活动。后续版本可增加精细的分叉解析。
- 日志格式随 Codex 版本变化，适配器需要持续维护；不支持读取 ChatGPT 网页聊天历史。
- 无账号、云同步、付费奖励、在线排名或自动更新；社区联网扩展应自行明确征求用户选择。
- 首版界面为中文；README 与贡献接口为双语。国际化界面欢迎贡献。

## English

TokenGo is a local desktop companion, **not an official OpenAI extension**. It watches Codex rollout files, evaluates declarative achievements, displays a non-focusing bottom-right unlock card, and generates shareable PNGs locally. The first release ships with 1,200 tiered milestones across 60 metric families and 24 hidden discoveries.

The desktop uses Electron; the collector and engine use Node.js built-ins only. Data stays on the device. Sharing is explicit and opens the platform's composer; image attachment and final publishing remain manual. The static website is a clearly labeled demo, not a cloud account or a data collector.

**Offline achievements cannot be cheat-proof on a user-controlled computer.** Integrity checks detect basic edits; they do not prove results to strangers. No global rarity percentages or certified leaderboards are claimed. History discoveries, live observations, migrations, and demo records are labeled separately.

See [architecture](docs/ARCHITECTURE.md), [metric definitions](docs/METRICS.md), [contribution guide](CONTRIBUTING.md), and [security boundaries](SECURITY.md).

## Repository map

```text
src/core/       Pure local engine, Codex adapter, incremental collector
src/desktop/    Electron host, isolated IPC, native unlock window
src/ui/         Trophy cabinet, filters, local canvas share cards
packs/          Declarative community-extensible achievement packs
tests/          Behavioral and integrity tests
scripts/        Validation, static site generation, UI smoke testing
.github/        CI, GitHub Pages deployment, cross-platform release builds
```

## License

[MIT](LICENSE). Included vector badge artwork is original and distributed under the same license. Steam and World of Warcraft inspired the interaction pattern; no proprietary artwork or assets are included. TokenGo is not affiliated with Valve, Blizzard, or OpenAI.
