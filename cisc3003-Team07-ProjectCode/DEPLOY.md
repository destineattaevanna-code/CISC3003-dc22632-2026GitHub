# 部署到 GitHub Pages — 5 分钟上线

最终 URL 会像：

```
https://<你的GitHub用户名>.github.io/iSuperviz/
```

## 方法 A：一次性把 build/ 推到 gh-pages 分支（最快）

把这个目录当成项目根目录，在 Terminal 里按顺序执行（只需一次；以后要更新就重复 step 3）：

```bash
# 0. 先在 https://github.com/new 创建一个名叫 `iSuperviz` 的空仓库（public）。

# 1. 初始化并推主分支（如果已经有 git 仓库就跳过 init）
cd /Users/yangxu/Desktop/cursor/iSuperviz
git init -b main
git add .
git commit -m "iSuperviz Team 07 project"
git remote add origin https://github.com/<你的用户名>/iSuperviz.git
git push -u origin main

# 2. 首次构建一下（如果你没动过代码可跳过）
CI=false REACT_APP_FORCE_MOCK=1 npm run build

# 3. 把 build/ 当成一个 gh-pages 分支推上去
#    下面这段命令会在不影响 main 的前提下把 build 目录发布到 gh-pages 分支。
cd build
git init -b gh-pages
git add .
git commit -m "publish"
git remote add origin https://github.com/<你的用户名>/iSuperviz.git
git push -f origin gh-pages

# 4. 回到 GitHub 页面 → Settings → Pages
#    - Source 选 "Deploy from a branch"
#    - Branch 选 gh-pages,  root 为 /
#    - Save
#    等 1~2 分钟，URL 就会出现在页面顶部。
```

## 方法 B：GitHub Actions 全自动（推荐长期用）

项目里 `.github/workflows/deploy-pages.yml` 已经写好了。只要：

1. 把仓库推到 GitHub（`git push -u origin main`）。
2. GitHub 仓库 → Settings → Pages → Source 选 **GitHub Actions**。
3. 之后每次 `git push` 到 main 都会自动跑测试 → 构建 → 发布。URL 会显示在 Actions 运行记录里。

## 验证发布是否成功

- 等 Pages Settings 里显示绿色 "Your site is live at …"
- 打开 URL，应该看到 iSuperviz Home 页（紫色 hero）
- 点 Login → "Fill for me" 用 demo 账户登录 → Paper / Idea Graph / Shop 全部能用

## 需要改 URL？

如果你想把仓库名改成 `CISC3003-Team07-iSuperviz`，最终 URL 会变成：

```
https://<你的用户名>.github.io/CISC3003-Team07-iSuperviz/
```

因为 CRA 的 `homepage: "."` + HashRouter，换 repo 名不需要改任何代码。

## 自定义域名（可选加分）

1. 买一个域名（Namecheap、Cloudflare ~$10/年）。
2. GitHub Pages → Custom domain → 填 `isuperviz.yourdomain.com`。
3. 域名解析那边加一个 CNAME 指向 `<用户名>.github.io`。
