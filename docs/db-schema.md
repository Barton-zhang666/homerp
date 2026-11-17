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

当前基线为 `9420128cdcd3_initial_baseline.py`，不创建业务表。
新环境首次启动只需执行 `cd apps/backend`、`uv run alembic upgrade head`。
业务切片引入模型后，在模型包中显式导入，执行：

```sh
cd apps/backend
uv run alembic revision --autogenerate -m "describe schema change"
uv run alembic upgrade head
uv run alembic check
```

提交前检查 revision 的 upgrade/downgrade 内容，PR 中填写 revision 文件名。
`alembic check` 检查模型与数据库结构是否一致，需要可连接的 MySQL。

## 本地部署验收（2026-11-17）

- 环境：Windows Docker Desktop，`desktop-linux` context，Compose v5.7.0。
- 镜像：`mysql:8.0`，实际 MySQL 版本 8.0.46。
- `docker compose config --quiet` 与 `docker compose up -d` 成功。
- 容器 `home-erp-mysql` 为 healthy，宿主机端口 3306 可连接。
- Windows 宿主机使用 SQLAlchemy async + asyncmy，以 `dev_user` 连接 `home_erp` 成功。
- 容器内 MySQL CLI 使用 TCP 和开发用户连接成功。
- 数据库字符集为 `utf8mb4`，排序规则为 `utf8mb4_unicode_ci`。
- `alembic revision --autogenerate -m "initial baseline"` 成功；空基线不包含业务 DDL。
- `alembic upgrade head` 成功，数据库版本为 `9420128cdcd3`。
- 在新建的空开发库验证 `downgrade base` → `upgrade head` 成功。
- `docker compose restart mysql` 后恢复 healthy，迁移版本仍保留。
- `alembic check` 返回 `No new upgrade operations detected.`。

数据库目前仅有 `alembic_version`。这验证了连接、迁移管理和重启后版本保留，
业务表、业务数据与生产部署仍需在后续切片中分别验证。
MySQL 通过 Compose 运行；本轮前后端使用宿主机开发服务器，尚未容器化。
