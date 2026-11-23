# 夜航手记 NIGHTLOG

一个可部署到 GitHub Pages 的中文静态博客。原生 HTML、CSS 与 JavaScript，无需数据库、API 密钥或第三方字体。六篇初始文章是可删除、可改写的示例。

## 本地预览

使用 Node.js 22 或以上版本，在仓库根目录运行：

```sh
node scripts/build.mjs
```

本地可直接打开 `dist/index.html`。如需通过 HTTP 预览，在仓库根目录运行 `python -m http.server 8080 --directory dist`，再打开 http://localhost:8080 。Windows 可将 python 换成 py。

## 发布到 GitHub Pages

1. 在自己的 GitHub 账号创建一个空仓库，默认分支使用 `main`。个人主页可以用 `用户名.github.io` 作仓库名，普通项目仓库也可用。
2. 解压源码。将 `.github/`、`config/`、`content/`、`static/`、`scripts/`、`templates/` 和 README 等放在仓库根目录，提交到 `main`。请保留隐藏目录 `.github`。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
4. 打开 **Actions → Publish Nightlog → Run workflow**，选择 `main` 运行。此后推送会自动更新。绿色部署任务的 environment 链接就是博客地址。

GitHub Free 用户可使用公开仓库。请在发布前检查示例文章、作者署名和关于页。配置说明见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 日常维护：直接在 GitHub 网页上改

部署好后，可以直接在网页上编辑源文件。每次点 **Commit changes** 提交到 `main`，工作流 **Publish Nightlog** 就会重新生成网页。如果你提交到新分支，先把它合并到 `main`。在仓库 **Actions** 里看到该次部署成功后，刷新博客即可。

### 1. 发布一篇新文章

空白模板是 `templates/post.md`。本地写作时，把它复制成 `content/my-first-post.md`，填好头部字段，再写正文；默认封面可以直接使用。网页上操作时，先复制模板内容，然后进入仓库的 `content/` 文件夹，点 **Add file → Create new file**。用小写英文字母、数字或短横线命名，例如 `my-first-post.md`。可以直接粘贴下面这一整段，再修改内容。

```markdown
---
title: 我的第一篇手记
category: 编程笔记
date: 2026-11-19
cover: keys.webp
tags: C 语言,学习笔记
description: 用一句话概括这次写了什么。
---

## 从一个问题开始

这里写正文。用空行分段。

## 我的结论

这里写第二节。
```

日期改成实际发布日期，格式为 `年-月-日`，月份和日期都写两位。可直接使用已有封面 `keys.webp`、`waves.webp`、`walk.webp` 和 `orbit.webp`。自己的图片先上传到 `static/assets/`，然后在 `cover` 填文件名。分类、标签、搜索、归档和订阅会随文章自动更新。文件名决定文章网址，发布后改标题可以保留原来的文件名。

目前正文支持段落、二级标题、粗体、行内代码和三反引号代码块。段落和标题之间留一个空行。

### 2. 挂一条友链

打开 `config/friends.json`，点击铅笔图标编辑。初始内容是 `[]`。第一次可以把它整个换成下面的示例，换上朋友的真实站名、完整网址和一句介绍后提交：

```json
[
  {
    "name": "朋友的小站",
    "url": "https://example.com/",
    "description": "记录摄影和日常观察。"
  }
]
```

再加朋友时，在前一个对象的 `}` 后加英文逗号，再放下一个对象。最后一个对象后不要加逗号。站点顺序与数组顺序一致。介绍可以留空，头像位置会显示站名首字。删除对应对象即可撤下友链。文件内容变回 `[]` 时，页面自动显示空状态。

### 3. 改首页展板

打开 `config/home.json`，点击铅笔图标。比如让首页推荐刚发表的 `my-first-post.md`，并给展板写一个独立的标题：

```json
{
  "featuredPost": "my-first-post",
  "label": "本周手记",
  "labelEnglish": "FIELD NOTES",
  "title": "最近在研究什么？",
  "description": "这里写一两句话，介绍本期推荐内容。",
  "buttonText": "打开手记"
}
```

| 字段 | 对应位置 | 填写方式 |
| --- | --- | --- |
| `featuredPost` | 展板封面、作者栏中的日期与阅读时长、按钮目的地 | 填已存在文章的文件名，省略 `.md`。留空时，优先选头部有 `featured: true` 的文章，其次选最新文章 |
| `label`、`labelEnglish` | 展板左上角小字 | 分别填写中文和英文 |
| `title`、`description` | 大标题和下面的简介 | 填写后仅影响展板。留空时自动使用精选文章的标题、简介 |
| `buttonText` | 展板按钮 | 例如“阅读全文” |

只想换展板文字，可以保留 `featuredPost` 的原值。要换展板图片，修改所选文章的 `cover`。JSON 文件使用英文双引号和逗号。如果工作流失败，在 **Actions → Publish Nightlog** 打开对应运行，查看 **Build blog** 的报错。

### 4. 修改关于页和作者名

打开 `content/about.html`。名片下面的 `<p>` 是一句话简介，`<h2>` 是各节标题，正文直接写在对应的 `<p>` 里。复制一个 `<section>…</section>` 可以新增一节。文件里有中文注释。

全站署名在 `config/site.json` 的 `author`。关于页里的 `{{author}}` 会自动显示这个名字。保存后运行 `node scripts/build.mjs`，打开 `dist/about.html` 查看效果。直接改 `dist/` 里的文件会在下次构建时被覆盖。

## 自定义

- 站名及导航在 `scripts/build.mjs`。
- 全站鼠标几何粒子效果在 `static/assets/particles.js`。系统开启减少动态效果时会关闭动画。
- 配色、排版、动效和响应式规则在 `static/assets/site.css`。
- 搜索、主题、收藏和阅读进度在 `static/assets/site.js`。收藏和显示偏好保存在当前浏览器。
- GitHub Actions 自动获取站点地址并生成绝对订阅链接与 sitemap。部署到其他域名时，在构建前设置环境变量 `SITE_URL` 为实际根地址。
- 本地构建覆盖已有页面。删除或改名文章后，以空的 `dist` 目录重新构建可清除旧页面。GitHub 工作流会使用新检出的源文件重新构建。
