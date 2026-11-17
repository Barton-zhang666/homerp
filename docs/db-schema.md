# 数据库与迁移

开发环境：MySQL 8.0，数据库 `home_erp`，`utf8mb4` 字符集，
`utf8mb4_unicode_ci` 排序规则。Compose 凭据仅用于本地开发。

```sh
docker compose up -d
docker compose ps
mysql -h 127.0.0.1 -u dev_user -p home_erp
```

输入开发密码 `dev_password`。未安装宿主机 MySQL 客户端时可用：

```sh
docker compose exec mysql mysql -u dev_user -p home_erp
```

健康检查使用开发用户连接目标库并执行 `SELECT 1`。
`mysql_data` 命名卷保留数据；`docker compose down` 不删除卷。

当前不创建业务表。业务切片引入模型后，在模型包中显式导入，执行：

```sh
cd apps/backend
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
uv run alembic check
```

提交前检查 revision 的 upgrade/downgrade 内容，PR 中填写 revision 文件名。
`alembic check` 检查模型与数据库结构是否一致，需要可连接的 MySQL。
初始化期间用户已选择暂缓 Docker 运行、连接、自动生成 revision 与迁移验收。
