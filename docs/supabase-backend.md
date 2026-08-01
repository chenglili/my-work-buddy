# Supabase 云端工作台配置

后端未配置完成前，保持 GitHub Variable `VITE_BACKEND_ENABLED=false` 或不创建该变量，线上应用会继续使用本地模式。

## 1. 创建 Supabase 项目

1. 登录 Supabase，新建项目，区域选择 Singapore。
2. 保存项目数据库密码，并记录 Project Ref、Project URL 和公开的 anon key。
3. 在 Authentication 设置中确认 Email 登录开启。部署工作流会同步站点 URL、回调 URL和匿名登录配置。
4. 第一位用邮箱完成登录的家长会自动创建“甜心家庭”和孩子档案。

## 2. 配置飞书群机器人

在“Codex测试群”添加自定义机器人，安全关键词填写 `任务`，复制机器人 Webhook。Webhook 只放入 GitHub Secret，不写入网页或仓库。

## 3. 配置 GitHub Secrets

打开仓库 `chenglili/my-work-buddy` 的 Settings → Secrets and variables → Actions，在 Secrets 中添加：

- `SUPABASE_ACCESS_TOKEN`：Supabase Account → Access Tokens 创建的令牌。
- `SUPABASE_PROJECT_REF`：项目的 Project Ref。
- `SUPABASE_DB_PASSWORD`：创建项目时设置的数据库密码。
- `FEISHU_WEBHOOK_URL`：“Codex测试群”机器人的完整 Webhook。

先不要设置 `VITE_BACKEND_ENABLED=true`。

## 4. 部署后端

1. 打开 GitHub Actions，手动运行 `Deploy Supabase Backend`。
2. 确认数据库迁移、Auth 配置和 `daily-ready` Edge Function 全部成功。
3. 在 Supabase Table Editor 中确认 `families`、`task_records`、`point_ledger` 等表已经建立。

## 5. 启用网页云端模式

在 GitHub Actions Variables 中添加：

- `VITE_BACKEND_ENABLED`：`true`
- `VITE_SUPABASE_URL`：项目 URL，例如 `https://abcdefgh.supabase.co`
- `VITE_SUPABASE_ANON_KEY`：项目公开 anon key

重新运行 `Deploy to GitHub Pages`。anon key 是受 RLS 保护的公开客户端标识，不要把 service role key 放进 GitHub Pages。

## 6. 迁移和配对

1. 先在记录最完整的主设备上打开甜心工作台，选择“家长登录”。
2. 使用家长邮箱打开登录链接。首次登录会自动备份并迁移该设备的本地积分和历史。
3. 在家长中心核对总积分、月历、报告、待审任务和兑换记录。
4. 在“设备管理”生成六位配对码。
5. 在孩子手机或平板选择“孩子设备”，填写配对码和设备名称。
6. 其他设备配对后直接使用云端数据，不再迁移各自旧记录。

## 7. 验收和回退

- 在孩子设备完成一项任务，确认家长设备实时更新。
- 断网完成一项任务，再联网确认“待同步”变为“已同步”。
- 家长批准待审任务，确认积分只增加一次。
- 当天全部必做任务完成或待审时，确认“Codex测试群”只收到一条“任务已完成”。
- 若后端验收失败，将 `VITE_BACKEND_ENABLED` 改为 `false` 并重新部署 Pages，即可恢复本地模式；首次迁移前的 JSON 仍保存在当前主设备。
