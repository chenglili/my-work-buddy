# 飞书任务完成通知配置

通知服务不会把飞书机器人 Webhook 写入网页或仓库。完成下面的一次性配置后，甜心工作台会在当天全部必做任务完成或提交待审时，向“Codex测试群”发送一次“任务已完成”。

## 1. 在飞书群添加机器人

1. 打开“Codex测试群”的群设置，进入“机器人”，选择“添加机器人”。
2. 添加“自定义机器人”，名称可填写“甜心工作台”。
3. 安全设置选择“关键词”，填写 `任务`。
4. 创建后复制 Webhook 地址。不要把地址发到群里、写进代码或提交到 GitHub。

## 2. 创建 Cloudflare Worker 资源

1. 注册或登录 Cloudflare，开通 Workers 免费套餐并设置 `workers.dev` 子域名。
2. 在 Workers KV 中创建命名空间 `my-work-buddy-notification-state`。
3. 记录 Cloudflare Account ID 和该 KV 命名空间的 32 位 ID。
4. 创建一个 API Token，授予当前账号的 Workers Scripts 编辑权限。

## 3. 配置 GitHub

打开仓库 `chenglili/my-work-buddy` 的 Settings → Secrets and variables → Actions。

在 Secrets 中添加：

- `CLOUDFLARE_API_TOKEN`：上一步创建的 Cloudflare API Token。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID。
- `FEISHU_WEBHOOK_URL`：“Codex测试群”自定义机器人的完整 Webhook。

在 Variables 中添加：

- `CLOUDFLARE_KV_NAMESPACE_ID`：Cloudflare KV 命名空间 ID。

## 4. 部署通知服务

1. 打开仓库 Actions，运行 `Deploy Feishu Notifier`。
2. 部署成功后，在 Cloudflare Worker 页面复制 Worker 地址。
3. 在 Worker 地址后附加 `/notify/daily-ready`，例如：
   `https://my-work-buddy-notifier.example.workers.dev/notify/daily-ready`
4. 回到 GitHub Actions Variables，新增 `VITE_FEISHU_NOTIFY_URL`，值为完整通知地址。
5. 重新运行 `Deploy to GitHub Pages`，让网页读取通知地址。

## 5. 验收

使用当天计划进行验证。最后一项必做任务完成或提交待审后，“Codex测试群”应只收到一条“任务已完成”。当天刷新网页、重复打开或完成家长审核都不应再次发送。
