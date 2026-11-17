"""initial baseline

Revision ID: 9420128cdcd3
Revises:
Create Date: 2026-11-17 11:55:01.432513

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "9420128cdcd3"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """建立空基线；业务表由后续 revision 添加。"""
    pass


def downgrade() -> None:
    """空基线没有需要回退的业务 DDL。"""
    pass
